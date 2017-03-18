module.exports = {
    openConn: openConn,
    closeConn: closeConn,
    getHistoricSlots: getHistoricSlots,
    updateHistoricSlots: updateHistoricSlots,
}

/* Import Mongo DB credentials */
const DB_CREDENTIALS = require('../data/dbCredentials.json');

/**
 * URL to access Mongo DB hosted on Heroku
 * @type {String}
 */
const MONGO_URI = DB_CREDENTIALS.mongo_uri;
/**
 * Mongo DB collection that stores historic slots.
 * Each entry is of the form {id: event id, time: time} (we denote this as type Slot below), 
 * where id is an int and Slot a javascript Date object
 */
const HISTORIC_SLOTS_COLLECTION = 'historic_slots';


const MongoClient = require('mongodb').MongoClient;
const async = require('async');
const _ = require('lodash');


/**
 * Returns the opened Mongo DB connection
 * @param  {Function} callback callback(err, db) where db is the Mongo DB connection established
 * @return {Mongo.DB}            Mongo DB Connection
 */
function openConn(callback) {
    MongoClient.connect(MONGO_URI, callback);
}

/**
 * Closes a Mongo DB connection
 * @param  {Mongo.DB}   db       Mongo DB connection
 * @param  {Function} callback callback(err, result) where result is the result of closing the DB connection
 * @return {Mongo.Result}            Result from closing DB connection
 */
function closeConn(db, callback) {
    db.close(callback);
}

/**
 * Returns the historic slots Mongo DB collection
 * @param {Mongo.DB} db Mongo DB connection
 * @return {[]Slot}            list of Slots
 */
function getHistoricSlots(db) {
    return db.collection(HISTORIC_SLOTS_COLLECTION);
}

/**
 * Determines which supplied slots are new, and insert them into DB collection.
 * @param {Mongo.DB} db Mongo DB connection
 * @param {Mongo.collection} coll Mongo DB collection for historic slots
 * @param  {[]Slot} slots list of Slots
 * @param {Function} callback callback(err, db, newSlots) list of inserted slots
 * @return {[]Slot} list of inserted Slots
 */
function updateHistoricSlots(db, coll, slots, callback) {
    return async.map(slots, (slot, callback) => {
        coll.update(slot, slot, {upsert: true}, (err, response) => {
            if (err) {
                return callback(err);
            }
            const newSlot = 'upserted' in response.result? slot: null;
            return callback(null, newSlot);
        });
    }, (err, newSlots) => {
        if (err) {
            return callback(err);
        }
        return callback(err, db, _.compact(newSlots));
    });
}