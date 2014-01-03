var async = require("async"),
    scraper = require("scraper"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem"),
    Price = mongoose.model("Price");

// Categories
var CATEGORY_DIGITAL_MUSIC = "Digital Music",
    CATEGORY_VIDEO_GAMES = "Video Games",
    CATEGORY_MOVIES_TV = "Movies & TV",
    CATEGORY_CAMERA_VIDEO = "Camera & Video",
    CATEGORY_TOYS_GAMES = "Toys & Games",
    CATEGORY_BOOKS = "Books",
    CATEGORY_KINDLE_BOOKS = "Kindle Books",
    CATEGORY_HOUSEHOLD = "Household",
    CATEGORY_HEALTH_PERSONAL_CARE = "Health & Personal Care",
    CATEGORY_OTHER = "Other";

function PriceUpdater() {

    var priceUpdater = this;

    /**
     * Updates the tracked items by scanning the uris contained within the tracked
     * item for the best price found. Once the best price is found, a check to see
     * if that price is different from the current best price. If it is, then a new
     * price is created with the details found in the last check.
     *
     * This will also update the tracked item's name and category if it does not
     * yet have those specified.
     *
     * @param  {Function} callback (Optional) Called when update is complete with a
     *                             possible error object passed as the first argument
     */
    this.updateTrackedItems = function(callback) {
        console.log();
        console.log("=== begin: update tracked items ===");

        TrackedItem.find().populate("prices").exec(function(err, trackedItems) {
            var count;

            if (err) {
                callback(err);
                return;
            }

            count = 0;
            // loop through the tracked items...
            async.whilst(
                function() {
                    return count < trackedItems.length;
                },
                function(whilstCallback) {
                    var trackedItem;

                    console.log(" -- processing tracked item " + count + " --");

                    trackedItem = trackedItems[count];
                    count++;

                    async.waterfall([
                        function(waterfallCallback) {
                            determineBestItemDetails(trackedItem, waterfallCallback);
                        },
                        function(itemDetails, waterfallCallback) {
                            var needToAddPrice;

                            // determine if we need to update the tracked item
                            needToAddPrice = determineIfUpdateIsNecessary(trackedItem,
                                itemDetails);

                            // only add the new price if we need to
                            if (needToAddPrice) {
                                addNewPrice(trackedItem, itemDetails, waterfallCallback);
                            } else {
                                // no need to add a new price here, move on
                                waterfallCallback();
                            }
                        }
                    ], function(err) {
                        whilstCallback(err);
                    });
                },
                function(err) {
                    if (err) {
                        console.error(err);
                    }

                    console.log("=== done updating tracked items ===");
                    console.log();
                    // if they supplied a callback, call it (passing any errors)
                    if (callback) {
                        callback(err);
                    }
                }
            );

        });
    }

    /**
     * Scrapes a website specified by the uri and gathers the item details, which
     * consists of the item's name, category, and current price found on the page
     * (if possible).
     *
     * @param  {String}   uri      The uri of the website to scan
     * @param  {Function} callback Callback called when complete, with first argument
     *                             a possible error object, and second argument the
     *                             item details. The item details consists of a name,
     *                             category, and price.
     */
    this.gatherItemDetails = function(uri, callback) {
        pageScrape(uri, function(err, $) {
            var itemDetails;

            if (err) {
                callback(err);
                return;
            }

            itemDetails = {};

            // find the price on the website
            itemDetails.price = findPriceOnPage(uri, $);

            // error check
            if (itemDetails.price === -1) {
                callback("unable to find price for uri: " + uri);
                return;
            }

            // find the category on the page
            itemDetails.category = findCategoryOnPage(uri, $);

            // find the name on the page (if we have the category)
            if (itemDetails.category) {
                itemDetails.name = findNameOnPage(uri, $, itemDetails.category);
            }

            // call the callback with our item details (null error)
            callback(null, itemDetails);
        });
    };

    function pageScrape(uri, callback) {
        var jqueryObject;

        async.whilst(
            function() {
                // run this until we get a jquery object
                return !jqueryObject;
            },
            function(whilstCallback) {
                // scrape the site to find the item details
                scraper({
                    uri: uri
                }, function(err, $) {
                    // check for errors
                    if (err) {
                        // if the error is 503, try again
                        if (err.message.indexOf("503") > -1) {
                            console.log("response status 503, retrying...");
                            whilstCallback();
                            return;
                        }
                        // else it's a bad error, all stop
                        whilstCallback(err);
                        return;
                    }

                    jqueryObject = $;
                    whilstCallback();
                });
            },
            function(err) {
                callback(err, jqueryObject);
            }
        );
    }

    function determineBestItemDetails(trackedItem, callback) {
        var itemDetails, count;

        /*
         * So what we're going to do below is loop through the uris found
         * within the tracked item. For each uri, we'll scrape the page to
         * find the price, name, and category. Initially we'll store the
         * details no matter what, but from then on we'll only store the
         * details if the price is better than the last. In the end we'll have
         * the best price at this moment given the uris of the tracked item.
         */
        count = 0;
        async.whilst(
            function() {
                return count < trackedItem.uris.length;
            },
            function(whilstCallback) {
                var uri;

                uri = trackedItem.uris[count];
                count++;

                priceUpdater.gatherItemDetails(uri, function(err, currentItemDetails) {
                    if (err) {
                        whilstCallback(err);
                        return;
                    }

                    // do we not yet have item details? or if we've got an item,
                    // details, do we now have a better price?
                    if (!itemDetails || itemDetails.price > currentItemDetails.price) {
                        // we may need to initialize itemDetails
                        itemDetails = itemDetails ? itemDetails : {};
                        // update with these item details
                        itemDetails.price = currentItemDetails.price;
                        itemDetails.uri = uri;
                        itemDetails.name = currentItemDetails.name;
                        itemDetails.category = currentItemDetails.category;
                    }

                    // continue on to the next uri
                    whilstCallback();
                });

            },
            function(err) {
                // call our callback with a possible error object and the
                // item details found after work completed above
                callback(err, itemDetails);
            }
        );
    }

    function findPriceOnPage(uri, $) {
        var price;

        if (uri.indexOf("amazon") > -1) {
            price = $("#actualPriceValue");
            if (!price || price.length < 1) {
                // try to find it another way
                price = $("#priceblock_ourprice");
                if (!price || price.length < 1) {
                    // try to find it another way
                    price = $("#priceBlock .priceLarge");
                    if (!price || price.length < 1) {
                        console.error("actual price value not found on amazon page, " +
                            "uri: " + uri);
                        return -1;
                    }
                }
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
    }

    function findCategoryOnPage(uri, $) {
        var category;

        if (uri.indexOf("amazon") > -1) {
            category = $("#nav-subnav").data("category");
            if (!category || category.length < 1) {
                console.error("category not found on amazon page, uri: " + uri);
                return null;
            }

            if (category === "dmusic") {
                category = CATEGORY_DIGITAL_MUSIC;
            } else if (category === "videogames") {
                category = CATEGORY_VIDEO_GAMES;
            } else if (category === "movies-tv") {
                category = CATEGORY_MOVIES_TV;
            } else if (category === "photo") {
                category = CATEGORY_CAMERA_VIDEO;
            } else if (category === "toys-and-games") {
                category = CATEGORY_TOYS_GAMES;
            } else if (category === "shared-fiona-attributes") {
                category = CATEGORY_KINDLE_BOOKS;
            } else if (category === "books") {
                category = CATEGORY_BOOKS;
            } else if (category === "hi") {
                category = CATEGORY_HOUSEHOLD;
            } else if (category === "hpc") {
                category = CATEGORY_HEALTH_PERSONAL_CARE;
            } else {
                console.log("category not setup, using 'other'");
                category = CATEGORY_OTHER;
            }

            console.log("category: " + category);

            return category;
        } else {
            console.error("unknown site!! " + uri);
            return null;
        }
    }

    function findNameOnPage(uri, $, category) {
        var name;

        if (uri.indexOf("amazon") > -1) {
            if (category === CATEGORY_DIGITAL_MUSIC) {
                name = $("#artist_row").text().trim() + ": " +
                    $("#title_row").text().trim();
            } else {
                name = $("#btAsinTitle").text().trim();
                // try another if this one doesn't work
                if (!name || name.length < 1) {
                    name = $("#title").text().trim();
                }
            }
            if (!name || name.length < 1) {
                console.error("name not found on amazon page, uri: " + uri);
                return null;
            }

            console.log("name: " + name);

            return name;
        } else {
            console.error("unknown site!! " + uri);
            return null;
        }
    }

    function determineIfUpdateIsNecessary(trackedItem, itemDetails) {
        var needToAddPrice, prices, latestPrice;

        // determine if this is a new price
        needToAddPrice = false;
        prices = trackedItem.prices;
        if (prices.length > 0) {
            latestPrice = prices[prices.length - 1];
            if (latestPrice.price !== itemDetails.price) {
                // we've got a new price!
                console.log("new price found for trackedItem: " + trackedItem.name);
                needToAddPrice = true;
            } else {
                // the new price is not different, don't add it
                console.log("price is not different, no need to update");
                needToAddPrice = false;
            }
        } else {
            // there are no prices yet, add this one
            console.log("establishing base price for trackedItem: " + itemDetails.name);
            needToAddPrice = true;
        }

        return needToAddPrice;
    }

    function addNewPrice(trackedItem, itemDetails, callback) {
        var price;

        // create a new price with date established -> now
        price = new Price({
            price: itemDetails.price,
            uri: itemDetails.uri,
            dateEstablished: new Date()
        });
        price.save(function(err, price) {
            if (err) {
                callback(err);
                return;
            }

            trackedItem.prices.splice(0, 0, price);
            // update the name and category if necessary and available
            if (!trackedItem.name && itemDetails.name) {
                trackedItem.name = itemDetails.name;
            }
            if (!trackedItem.category && itemDetails.category) {
                trackedItem.category = itemDetails.category;
            }
            trackedItem.save(function(err, trackedItem) {
                // call callback (with possible error)
                callback(err);
            });
        });
    }
}

module.exports = new PriceUpdater();
