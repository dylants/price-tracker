var cronJob = require("cron").CronJob,
    priceUpdater = require("./lib/price-updater");

// Run this cron job every 6 hours
new cronJob("00 00 */6 * * *", function() {
    console.log("Cron job: triggering a price update");
    priceUpdater.updateTrackedItems();
}, null, true);
