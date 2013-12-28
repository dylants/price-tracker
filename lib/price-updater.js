var async = require("async"),
    scraper = require("scraper"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem"),
    Price = mongoose.model("Price");

function PriceUpdater() {}

PriceUpdater.prototype.updateTrackedItems = function(callback) {
    TrackedItem.find().populate("prices").exec(function(err, trackedItems) {
        var outerCount;

        if (err) {
            callback(err);
            return;
        }

        outerCount = 0;
        // loop through the tracked items...
        async.whilst(
            function() {
                return outerCount < trackedItems.length;
            },
            function(whilstCallback) {
                var trackedItem;

                trackedItem = trackedItems[outerCount];
                outerCount++;

                // for each tracked item, find the current best price
                findCurrentBestPrice(trackedItem, function(err, bestPrice) {
                    var prices, latestPrice, needToAddPrice, price;

                    if (err) {
                        whilstCallback(err);
                        return;
                    }

                    // determine if this is a new price
                    needToAddPrice = false;
                    prices = trackedItem.prices;
                    if (prices.length > 0) {
                        latestPrice = prices[prices.length - 1];
                        if (latestPrice.price !== bestPrice.price) {
                            // we've got a new price!
                            console.log("new price found for trackedItem: " + trackedItem.name);
                            needToAddPrice = true;
                        } else {
                            // the new price is not different, don't add it
                            console.log("price is not different");
                            needToAddPrice = false;
                        }
                    } else {
                        // there are no prices yet, add this one
                        console.log("establishing base price for trackedItem: " + trackedItem.name);
                        needToAddPrice = true;
                    }

                    // only add the new price if we need to
                    if (needToAddPrice) {
                        newPrice = new Price({
                            price: bestPrice.price,
                            uri: bestPrice.uri,
                            dateEstablished: new Date()
                        });
                        newPrice.save(function(err, price) {
                            if (err) {
                                whilstCallback(err);
                                return;
                            }

                            trackedItem.prices.splice(0, 0, price);
                            trackedItem.save(function(err, trackedItem) {
                                // move on to the next...
                                whilstCallback(err);
                            });
                        });
                    } else {
                        // no need to add a new price here, move on
                        whilstCallback();
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

var findCurrentBestPrice = function(trackedItem, callback) {
    var bestPrice, innerCount;

    /*
     * So what we're going to do below is loop through the uris
     * found within the tracked item. For each uri, we'll scrape
     * the page to find the price. Initially we'll store the first
     * price no matter what, but from then on we'll only store the
     * price if it's better than the last. In the end we'll have
     * the best price at this moment given the uris of the tracked item.
     */
    innerCount = 0;
    async.whilst(
        function() {
            return innerCount < trackedItem.uris.length;
        },
        function(whilstCallback) {
            var uri;

            uri = trackedItem.uris[innerCount];
            innerCount++;

            // scrape the site to find the current price
            scraper({
                uri: uri
            }, function(err, $) {
                var price;

                if (err) {
                    whilstCallback(err);
                    return;
                }

                // find the price on the website
                price = findPriceOnPage(uri, $);

                // error check
                if (price === -1) {
                    whilstCallback("unable to find price for uri: " + uri);
                    return;
                }

                // is there a better price (or first time looking?)
                if (!bestPrice || bestPrice.price > price) {
                    bestPrice = bestPrice ? bestPrice : {};
                    // update with the lower price...
                    bestPrice.price = price;
                    bestPrice.uri = uri;
                    whilstCallback(err);
                } else {
                    // continue to the next uri...
                    whilstCallback(null);
                }
            });
        },
        function(err) {
            // call our callback with a possible error object and the
            // best price found after work completed above
            callback(err, bestPrice);
        }
    );
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
