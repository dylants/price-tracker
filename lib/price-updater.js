var async = require("async"),
    request = require("request"),
    cheerio = require("cheerio"),
    moment = require("moment"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem"),
    Price = mongoose.model("Price"),
    Status = mongoose.model("Status");

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

// The minimum amount of difference percentage wise that a price
// has to change to require an update in the price. Percentage is
// calculated from 0 - 1, with 1 = 100% and 0 = 0%. So .10 = 10%
var MIN_PERCENTAGE_CHANGE_NEEDED_TO_UPDATE = 0.10;

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
        var startTime;

        startTime = moment(new Date());
        console.log();
        console.log("=== begin update tracked items at " +
            startTime.format("ddd MMM D YYYY, h:mm:ssa ZZ") + " ===");

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
                    var endTime;

                    if (err) {
                        console.error(err);
                    }

                    endTime = moment(new Date());
                    console.log();
                    console.log("=== end update tracked items at " +
                        endTime.format("ddd MMM D YYYY, h:mm:ssa ZZ") + " ===");
                    console.log("=== duration: " + endTime.diff(startTime, "seconds") +
                        " seconds ===");
                    console.log();

                    // update the status
                    Status.findOne(function(err, status) {
                        if (status === null) {
                            status = new Status();
                        }
                        status.lastUpdateStart = startTime.toDate();
                        status.lastUpdateEnd = endTime.toDate();
                        status.save();
                    });

                    // if they supplied a callback, call it (passing any errors)
                    if (callback) {
                        callback(err);
                    }
                }
            );

        });
    };

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
                request(uri, function(err, response, body) {
                    if (err) {
                        whilstCallback(err);
                        return;
                    }
                    if (response) {
                        if (response.statusCode === 200) {
                            // good response, build jquery object using cheerio
                            jqueryObject = cheerio.load(body);
                            whilstCallback();
                            return;
                        } else if (response.statusCode === 503) {
                            // if we get a 503, try again
                            console.log("response status 503, retrying...");
                            whilstCallback();
                            return;
                        } else {
                            // else it's a bad response status, all stop
                            whilstCallback("response status: " + response.statusCode);
                            return;
                        }
                    } else {
                        whilstCallback("no response object found!");
                        return;
                    }
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
        var price, selectors;

        if (uri.indexOf("amazon") > -1) {
            // the various ways we can find the price on an amazon page
            selectors = [
                "#actualPriceValue",
                "#priceblock_ourprice",
                "#priceBlock .priceLarge",
                // Yes this is weird, but for some reason "rentPrice"
                // is the buy price
                ".buyNewOffers .rentPrice"
            ];

            // find the price on the page
            price = findContentOnPage($, selectors);

            // were we successful?
            if (!price) {
                console.error("price not found on amazon page, uri: " + uri);
                return -1;
            }

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
        var name, selectors;

        if (uri.indexOf("amazon") > -1) {
            if (category === CATEGORY_DIGITAL_MUSIC) {
                name = $("#artist_row").text().trim() + ": " +
                    $("#title_row").text().trim();
            } else {
                selectors = [
                    "#btAsinTitle",
                    "#title"
                ];

                // use the selectors to find the name on the page
                name = findContentOnPage($, selectors);
            }

            if (!name) {
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

    function findContentOnPage($, selectors) {
        var i, content;

        // loop until we find the content, or we exhaust our selectors
        for (i = 0; i < selectors.length; i++) {
            content = $(selectors[i]);
            if (content && content.length > 0) {
                return content.text().trim();
            }
        }

        // if we've not found anything, return null to signify that
        return null;
    }

    function determineIfUpdateIsNecessary(trackedItem, itemDetails) {
        var needToAddPrice, prices, currentPrice, priceDifference, percentageDifference;

        // determine if this is a new price
        needToAddPrice = false;
        prices = trackedItem.prices;
        if (prices.length > 0) {
            currentPrice = prices[0].price;
            if (currentPrice !== itemDetails.price) {
                // we've got a new price!
                console.log("new price found for trackedItem: " + trackedItem.name);

                // let's figure out how much different this new price is...
                if (currentPrice > itemDetails.price) {
                    priceDifference = currentPrice - itemDetails.price;
                } else {
                    priceDifference = itemDetails.price - currentPrice;
                }
                console.log("  price difference: " + priceDifference);

                // determine the percentage difference
                percentageDifference = priceDifference / currentPrice;
                console.log("  percentage difference: " + (percentageDifference * 100));

                if (percentageDifference >= MIN_PERCENTAGE_CHANGE_NEEDED_TO_UPDATE) {
                    console.log("  percentage difference is over minimum required, updating...");
                    needToAddPrice = true;
                } else {
                    console.log("  percentage difference is NOT over minimum required to update");
                }
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
            trackedItem: trackedItem,
            price: itemDetails.price,
            uri: itemDetails.uri,
            dateEstablished: new Date()
        });
        price.save(function(err, price) {
            if (err) {
                callback(err);
                return;
            }

            // add the price to the beginning of the prices array
            trackedItem.prices.splice(0, 0, price);

            // update the name and category if necessary and available
            if (!trackedItem.name && itemDetails.name) {
                trackedItem.name = itemDetails.name;
            }
            if (!trackedItem.category && itemDetails.category) {
                trackedItem.category = itemDetails.category;
            }

            // save the tracked item
            trackedItem.save(function(err, trackedItem) {
                // call callback (with possible error)
                callback(err);
            });
        });
    }
}

module.exports = new PriceUpdater();
