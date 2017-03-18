const Slot = require('./lib/slot.js');
const Calendar = require('./lib/calendar.js');
const DB = require('./lib/db.js');
const Email = require('./lib/email.js');
const Events = require('./lib/events.js');


const _ = require('lodash');
const async = require('async');


// list of email receipient Objects {name: string, email: string, criteria: [Function: Slot -> boolean]}
const RECEIPIENTS = require('./data/receipients.js');

const MONTHS_LOOKAHEAD = 2; // Look ahead 2 months in advance

function main() {
    Events.getFreeEvents((err, freeEvents) => {
        if (err) {return console.error(err);}

        const eventIds = freeEvents.map(e => e.id);
        Events.getSlotsForEvents(eventIds, MONTHS_LOOKAHEAD, (err, lsbSlots) => {
            if (err) {return console.error(err);}

            DB.openConn((err, db) => {
                if (err) {return console.error(err);}
                console.log('Opened DB connection');
                const historicSlotsCollection = DB.getHistoricSlots(db);
                DB.updateHistoricSlots(db, historicSlotsCollection, lsbSlots, (err, db, newSlots) => {
                    if (err) {console.error(err); process.exit(0);}
                    
                    Email.sendEmails(freeEvents, newSlots, RECEIPIENTS, (err, deliveredAddresses) => {
                        if (err) {console.error(err);}
                        console.log('Sent emails to: ' + JSON.stringify(deliveredAddresses));
                        process.exit(0);
                    });
                });
            });
        });
    });
    
    
}

main();