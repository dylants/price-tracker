var async = require("async"),
    scraper = require("scraper"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem");

function PriceUpdater() {}

PriceUpdater.prototype.updateTrackedItems = function(callback) {
    TrackedItem.find(function(err, trackedItems) {
        var count;

        if (err) {
            callback(err);
            return;
        }

        count = 0;
        async.whilst(
            function() {
                return count < trackedItems.length;
            },
            function(whilstCallback) {
                var trackedItem;

                trackedItem = trackedItems[count];
                count++;

                // TODO handle multiple uris
                scraper({
                    uri: trackedItem.uris[0]
                }, function(err, $) {
                    var price, priceNow;

                    if (err) {
                        whilstCallback(err);
                        return;
                    }

                    // TODO assume amazon
                    price = $("#actualPriceValue");
                    if (!price || price.length < 1) {
                        whilstCallback("actual price not found!");
                        return;
                    }

                    // pull the price from the website
                    price = $(price[0]).text().trim();
                    console.log("price: " + price);

                    // get the number value (remove dollar sign)
                    price = +(price.slice(1));

                    // is there's a new price?
                    if (trackedItem.bestPrice != price) {
                        // update with the new price...
                        trackedItem.bestPrice = price;
                        trackedItem.bestPriceUri = trackedItem.uris[0];
                        trackedItem.save(function(err, trackedItem) {
                            whilstCallback(err);
                        });
                    } else {
                        // continue to the next tracked item...
                        whilstCallback(null);
                    }
                });
            },
            function(err) {
                console.log("done!");
                callback(err);
            }
        );

    });
};

module.exports = new PriceUpdater();
