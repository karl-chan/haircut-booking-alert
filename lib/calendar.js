module.exports = {
    dateFromNow: dateFromNow,
    parseDateTime: parseDateTime,
    getDateTimeComponents: getDateTimeComponents,
    now: now
}

const TIME_ZONE = 'Europe/London';

const moment = require('moment-timezone');

/**
 * Returns date from now in the format [y, m, d] (e.g. [2017, 3, 12] for 12 Mar 2017)
 * @param  {int} addYears  number of years to add
 * @param  {int} addMonths number of months to add
 * @param  {int } addDays   number of days to add
 * @return {[]int}           [y, m, d]
 */
function dateFromNow(addYears, addMonths, addDays) {
    const t = moment().tz(TIME_ZONE)
                .add(addYears, 'years')
                .add(addMonths, 'months')
                .add(addDays, 'days');
    return [t.get('year'), t.get('month') + 1, t.get('day')]
}

/**
 * Returns javascript Date object of a date time string in 'yyyy-mm-dd hh:mm:ss' format (e.g. '2017-03-13 19:59:00')
 * @param  {String} dateTimeString date time string in 'yyyy-mm-dd hh:mm:ss' format
 * @return {Date}                corresponding date
 */
function parseDateTime(dateTimeString) {
    return moment.tz(dateTimeString, TIME_ZONE).toDate();
}

/**
 * Returns components of a javascript Date object as [y, M, d, h, m, s, dayOfWeek]
 * @param  {Date} date javascript Date object
 * @return {[]int]}      [y, M, d, h, m, s, dayOfWeek] (e.g. [2017, 3, 13, 19, 59, 0, 1] for 2017-03-13 19:59:00 Monday)
 *   where M is between 1 - 12, dayOfWeek between 0 - 6
 */
function getDateTimeComponents(date) {
    const t = moment.tz(date, TIME_ZONE);
    return [t.get('year'), t.get('month') + 1, t.get('day'), t.get('hour'), t.get('minute'), t.get('second'), t.day()]
}

function now() {
    return moment().tz(TIME_ZONE).toDate();
}