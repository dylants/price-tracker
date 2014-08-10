"use strict";

var cronJob = require("cron").CronJob,
    utils = require("./lib/utils"),
    priceUpdater = require("./lib/price-updater");

// Run this cron job every Sunday (0) and Wednesday (3) at 7:00:00 AM
new cronJob("00 00 7 * * 0,3", function() {
    console.log("Cron job: triggering a price update at " + new Date());

    // before issuing a request to update the tracked items, sleep
    // anywhere between 1 minute and 180 minutes (3 hours) in an
    // attempt (which maybe futile) to make ourselves look less
    // robotic to websites
    var sleepTime = utils.generateNum(60000, 10800000);
    console.log("sleeping for " + sleepTime + " milliseconds");
    setTimeout(function() {
        priceUpdater.updateTrackedItems();
    }, sleepTime);
}, null, true);
