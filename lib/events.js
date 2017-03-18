module.exports = {
    get: get,
    getFreeEvents: getFreeEvents,
    getSlotsForEvent: getSlotsForEvent,
    getSlotsForEvents: getSlotsForEvents,
    getSlotsForEventSatisfying: getSlotsForEventSatisfying
}

const MAX_HTTP_RETRIES = 2;

const Calendar = require('./calendar.js');
const Slot = require('./slot.js');

const _ = require('lodash');
const async = require('async');
const request = require('request');
const jsdom = require('jsdom');
jsdom.defaultDocumentFeatures = { 
    FetchExternalResources   : ['script'],
    ProcessExternalResources : ['script'],
    MutationEvents           : '2.0',
};

/**
 * Get events from LSB page
 * @param  {Function} callback callback(err, events), where events is js variable scraped from page
 * @return {[]Event}            list of events at LSB
 */
function get(callback) {
    jsdom.env({
        url: 'http://londonschoolofbarbering.simplybook.me/sheduler/manage',
        features : {
            FetchExternalResources : ['script'],
            ProcessExternalResources : ['script']
        },
        done: (err, window) => {
            callback(err, window.events)
        }
    });
}

/**
 * Similar to get, where only free events are returned
 */
function getFreeEvents(callback) {
    get((err, events) => {
        if (err) {
            return callback(err);
        }
        const freeEvents = events.filter(e => e.price == 0);
        return callback(err, freeEvents);
    });
}

/**
 * Returns available slots given event id, up to n months from now, n = monthsLookahead
 * @param  {int} id              event id
 * @param  {int} monthsLookahead number of months to look ahead (default = 2)
 * @param  {Function} callback callback(slots), where slots is array of js Dates
 * @return {[]Slot}                 list of available slots for event
 */
function getSlotsForEvent(id, monthsLookahead, callback) {
    monthsLookahead = _.defaultTo(monthsLookahead, 2);

    getAvailableDatesForComingMonths(id, monthsLookahead, (err, availableDates) => {
        if (err) {
            return callback(err);
        }
        async.map(availableDates, (date, callback) => {
            getAvailableTimes(id, date, (err, timesOfDay) => {
                if (err) {
                    return callback(err);
                }
                const slots = timesOfDay.map(timeOfDay => {
                    const dateTimeString = `${date} ${timeOfDay}`;
                    const time = Calendar.parseDateTime(dateTimeString);
                    return new Slot(id, time);
                });
                return callback(null, slots);
            });
        }, (err, allSlotsArr) => {
            return callback(err, _.flattenDeep(allSlotsArr));
        });
    });
}

/***
 * Returns available slots given event ids, up to n months from now, n = monthsLookahead
 * @param  {[]int} ids              event ids
 * @param  {int} monthsLookahead number of months to look ahead (default = 2)
 * @param  {Function} callback callback(slots), where slots is array of js Dates
 * @return {[]Slot}                 list of available slots for event
 */
function getSlotsForEvents(ids, monthsLookahead, callback) {
    async.map(ids, (id, callback) => {
        getSlotsForEvent(id, monthsLookahead, callback);
    }, (err, slots) => {
        if (err) {
            return callback(err);
        }
        return callback(null, _.flattenDeep(slots));
    });
}

/**
 * See getSlotsForEvent, with extra predicate passed so that only slots satisfying
 *   predicate are returned.
 * @param  {int} id              event id
 * @param  {int} monthsLookahead number of months to look ahead (default = 2)
 * @param  {Function} predicate function: (Slot => boolean) to test against each available slot
 * @param  {Function} callback callback(slots), where slots is array of js Dates
 * @return {[]Date}                 list of available slots for event, satisfying supplied predicate
 */
function getSlotsForEventSatisfying(id, monthsLookahead, predicate, callback) {
    getSlotsForEvent(id, monthsLookahead, (err, slots) => {
        if (err) {
            return callback(err);
        }
        const satisfyingSlots = slots.filter(predicate);
        return callback(null, satisfyingSlots);
    });
}

/**
 * Returns available dates []'yyyy-mm-dd' given event id, year and month to lookup
 * @param  {int}   id       event id
 * @param  {int}   year     year to lookup
 * @param  {int}   month    month to lookup (1-12)
 * @param  {Function} callback callback(err, availableDates), where availableDates is array of strings in 'yyyy-mm-dd' format
 * @return {[]String}            list of available dates in 'yyyy-mm-dd' format
 */
function getAvailableDates(id, year, month, callback) {
    const url = `http://londonschoolofbarbering.simplybook.me/sheduler/load-monthly-calendar/year/${year}/month/${month}/event_id/${id}`;
    requestJSONWithRetries(MAX_HTTP_RETRIES, url, (err, data) => {  
        if (err) {
            return callback(err);
        }      
        
        // Transform data to array, as data is stored as object which is inconvenient
        const dataAsArray = _.values(_.mapValues(data.work_days, (value, key) => {
            value.date = key;
            return value;
        }));

        const availableDates = dataAsArray.filter(d => d.is_day_off == 0).map(d => d.date);
        callback(null, availableDates);
    });
}

/**
 * Returns available dates []'yyyy-mm-dd' given event id, year and month to lookup
 * @param  {int} id event id
 * @param  {int} monthsLookahead number of months to lookahead (default = 2)
 * @param  {Function} callback callback(err, availableDates), where availableDates is array of strings in 'yyyy-mm-dd' format
 * @return {[]String}            list of available dates in 'yyyy-mm-dd' format
 */
function getAvailableDatesForComingMonths(id, monthsLookahead, callback) {
    monthsLookahead = _.defaultTo(monthsLookahead, 2);

    const monthsToLookahead = _.range(monthsLookahead);
    async.map(monthsToLookahead, (lookahead, callback) => {
        const [y, m, d] = Calendar.dateFromNow(0, lookahead, 0);
        getAvailableDates(id, y, m, (err, dates) => {
            return callback(err, dates);
        });
    }, (err, allDatesArr) => {
        if (err) {
            return callback(err);
        }
        const allDates = _.flattenDeep(allDatesArr);

        // Remove those dates in the past
        const allFutureDates = allDates.filter(date => {
            const today = new Date();
            const parsedDate = Calendar.parseDateTime(date);
            return parsedDate >= today;
        })
        return callback(null, allFutureDates);
    });
}

/**
 * Returns available times []'hh:mm:ss' given event id and date string 'yyyy-mm-dd' to lookup
 * @param  {int}   id       event id
 * @param  {String}   date     date as 'yyyy-mm-dd' string
 * @param  {Function} callback callback(err, availableTimes), where availableTimes is array of strings in 'hh:mm:ss' format
 * @return {[]String}            list of available times in 'hh:mm:ss' format
 */
function getAvailableTimes(id, date, callback) {
    const url = `http://londonschoolofbarbering.simplybook.me/sheduler/get-starttime-matrix/?date=${date}&event_id=${id}`;
    requestJSONWithRetries(MAX_HTTP_RETRIES, url, (err, availableTimes) => {        
        console.log(url);
        console.log(availableTimes);
        return callback(err, availableTimes);
    });
}

/**
 * See request() in request.js
 * Performs request with up to n retries, and casts result into JSON
 * @param  {int}   n        max number of retries
 * @param  {options}   options  request.js options
 * @param  {Function} callback callback(err, json),
 *               where json is the data returned from the http request, as a js Object
 * @return {Object}            Javascript Object from http request
 */
function requestJSONWithRetries(n, options, callback) {
    async.retry(n, (callback, result) => {
        request(options, (err, res, body) => {
            if (err) {
                return callback(err);
            }
            try {
                const json = JSON.parse(body);
                return callback(null, json);
            } catch (err) {
                return callback(err);
            }
        });
    }, callback);
}
