**Deprecated: Use [beat-the-queue](https://github.com/karl-chan/beat-the-queue) instead.**

# London School of Barbering alert system

Want to have a free haircut?  The [London School of Barbering](http://www.londonschoolofbarbering.com/book-a-cut/free-haircuts/) offers them for men.  However they are very popular and the early bird catches the worm.

This solves your problem by raising email alerts when new slots are available for booking, subject to a customisable filter criteria (say your are only interested in having a haircut after a certain date / weekday / hour?).

## Prerequisites

You'll need Node.js installed as well as your own MongoDB database.

## Installation
1. Replace credentials and receipients info in `data` folder.
2. Set up scheduler task that runs `npm start` regularly.  An alert will be sent to you if it finds new suitable slots.
