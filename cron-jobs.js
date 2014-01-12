var cronJob = require("cron").CronJob,
    priceUpdater = require("./lib/price-updater");

// Run this cron job every day at 3am
new cronJob("00 00 03 * * *", function() {
    console.log("Cron job: triggering a price update");
    priceUpdater.updateTrackedItems();
}, null, true);
