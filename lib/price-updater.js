var async = require("async"),
    scraper = require("scraper"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem");

function PriceUpdater() {}

PriceUpdater.prototype.updateTrackedItems = function(callback) {
    TrackedItem.find(function(err, trackedItems) {
        var outerCount;

        if (err) {
            callback(err);
            return;
        }

        outerCount = 0;
        async.whilst(
            function() {
                return outerCount < trackedItems.length;
            },
            function(outerWhilstCallback) {
                var trackedItem, innerCount;

                trackedItem = trackedItems[outerCount];
                outerCount++;

                innerCount = 0;
                async.whilst(
                    function() {
                        return innerCount < trackedItem.uris.length;
                    },
                    function(innerWhilstCallback) {
                        var uri;

                        uri = trackedItem.uris[innerCount];
                        innerCount++;

                        scraper({
                            uri: uri
                        }, function(err, $) {
                            var price, priceNow;

                            if (err) {
                                innerWhilstCallback(err);
                                return;
                            }

                            // find the price on the website
                            price = findPriceOnPage(uri, $);

                            // error check
                            if (price === -1) {
                                innerWhilstCallback("unable to find price for uri: " + uri);
                                return;
                            }

                            // is there a better price (or first time looking?)
                            if (!trackedItem.bestPrice || trackedItem.bestPrice > price) {
                                // update with the lower price...
                                trackedItem.bestPrice = price;
                                trackedItem.bestPriceUri = trackedItem.uris[0];
                                trackedItem.bestPriceDate = new Date();
                                trackedItem.save(function(err, trackedItem) {
                                    innerWhilstCallback(err);
                                });
                            } else {
                                // continue to the next uri...
                                innerWhilstCallback(null);
                            }
                        });
                    },
                    function(err) {
                        // either error out, or continue on to next tracked item
                        outerWhilstCallback(err);
                    }
                );
            },
            function(err) {
                console.log("done!");
                callback(err);
            }
        );

    });
};

var findPriceOnPage = function(uri, $) {
    var price;

    if (uri.indexOf("amazon") > -1) {
        price = $("#actualPriceValue");
        if (!price || price.length < 1) {
            console.error("actual price value not found on amazon page, uri: " + uri);
            return -1;
        }

        // pull the price from the website
        price = $(price[0]).text().trim();

        // get the number value (remove dollar sign)
        price = +(price.slice(1));
        console.log("price: " + price);

        return price;
    } else {
        console.error("unknown site!! " + uri);
        return -1;
    }
};

module.exports = new PriceUpdater();
