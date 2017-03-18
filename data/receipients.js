// TODO: replace with list of email receipients and criteria
module.exports = [{
    name: 'replace with receipient name',
    email: 'replace with receipient email',
    criteria: alertCriteria, // replace with recepient's custom alert criteria
}]

const Calendar = require('../lib/Calendar.js');

/**
 * Example alert criteria - Either after 6 PM or whole day on Saturdays and Sundays
 * @param  {[type]} slot [description]
 * @return {[type]}      [description]
 */
function alertCriteria (slot) {
    const [y, M, d, h, m, s, dayOfWeek] = Calendar.getDateTimeComponents(slot.time);
    const SATURDAY = 6;
    const SUNDAY = 0;
    const AFTER_HOUR = 18;
    return h >= AFTER_HOUR || [SATURDAY, SUNDAY].includes(dayOfWeek);
}