module.exports = {
    sendEmails: sendEmails
}

/* Import SMTP mailbox credentials */
const SMTP_CREDENTIALS = require('../data/smtpCredentials.json');
const SMTP_SENDER = SMTP_CREDENTIALS.sender;
const SMTP_HOST = SMTP_CREDENTIALS.host;
const SMTP_PORT = SMTP_CREDENTIALS.port;
const SMTP_SECURE = SMTP_CREDENTIALS.secure;
const SMTP_USER = SMTP_CREDENTIALS.user;
const SMTP_PASS = SMTP_CREDENTIALS.pass;

const Slot = require('./slot.js');
const path = require('path');
const pug = require('pug');
const async = require('async');
const _ = require('lodash');
const nodemailer = require('nodemailer');
const juice = require('nodemailer-juice');
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});
transporter.use('compile', juice());

/**
 * Sends slot emails to receipients based individual criterion
 * @param  {[]Event}   events   list of events
 * @param  {[]Slot}   slots   list of slots
 * @param  {[]Recepient} receipients list of receipients email addresses
 * @param  {Function} callback callback(err, addresses) 
 *              where addresses is the list of email addreses of receipients who was delivered
 * @return {[type]}            [description]
 */
function sendEmails(events, slots, receipients, callback) {
    async.map(receipients, (receipient, callback) => {      
        const name = receipient.name;
        const address = receipient.email;
        const criteria = receipient.criteria;

        const slotsForReceipient = criteria? slots.filter(criteria): slots;
        if (_.isEmpty(slotsForReceipient)) {
            return callback();  // No need to send email if no new alerts for receipient
        }

        const mailOptions = {
            from: SMTP_SENDER,
            to: address,
            subject: 'LSB- Alerts',
            html: htmlEmail(name, events, slotsForReceipient, criteria),
            text: plainTextEmail(name, events, slotsForReceipient, criteria)
        }        
        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                return callback(err);
            }
            return callback(null, address);
        });
    }, (err, addresses) => {
        return callback(err, _.compact(addresses));
    });    
}

/**
 * Returns email in plain text, given list of events and slots to include
 * @param  {String}  name of receipient
 * @param  {[]Event} events list of events
 * @param  {[]Slot} slots list of slots
 * @param  {Function} predicate function to filter slots that should be sent to receipient
 * @return {String}        plain text email
 */
function plainTextEmail(name, events, slots, predicate) {
    const templatePath = path.join(__dirname, 'templates', 'plain-text-email.pug');
    const text = pug.renderFile(templatePath, {
        name: name,
        events: events,
        slots: slots
    });
    require('fs').writeFileSync(path.join(__dirname, '..', 'out', 'plain-text-email.out'), text);
    // console.log(text);
    return text;
}

/**
 * Returns email in html, given list of events and slots to include
 * @param  {String}  name of receipient
 * @param  {[]Event} events list of events
 * @param  {[]Slot} slots list of slots
 * @param  {Function} predicate function to filter slots that should be sent to receipient
 * @return {String}        html email
 */
function htmlEmail(name, events, slots, predicate) {
    const templatePath = path.join(__dirname, 'templates', 'html-email.pug');
    const html = pug.renderFile(templatePath, {
        name: name,
        events: events,
        slots: slots
    });
    require('fs').writeFileSync(path.join(__dirname, '..', 'out', 'html-email.out'), html);
    // console.log(html);
    return html;
}