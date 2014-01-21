var async = require("async"),
    request = require("request"),
    cheerio = require("cheerio"),
    moment = require("moment"),
    Browser = require("zombie"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem"),
    Price = mongoose.model("Price"),
    Status = mongoose.model("Status"),
    TrackedFlight = mongoose.model("TrackedFlight");

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

    this.updateTrackedFlights = function(callback) {
        var startTime;

        startTime = moment(new Date());
        console.log();
        console.log("=== begin update tracked flights at " +
            startTime.format("ddd MMM D YYYY, h:mm:ssa ZZ") + " ===");

        TrackedFlight.find(function(err, trackedFlights) {
            var count;

            if (err) {
                callback(err);
                return;
            }

            count = 0;
            async.whilst(
                function() {
                    return count < trackedFlights.length;
                },
                function(whilstCallback) {
                    var trackedFlight, browser;

                    console.log(" -- processing tracked flight " + count + " --");

                    trackedFlight = trackedFlights[count];
                    count++;

                    async.waterfall([
                        function(waterfallCallback) {
                            collectFlightPrices(trackedFlight, waterfallCallback);
                        },
                        function(outboundPrices, inboundPrices, waterfallCallback) {
                            parseDateAndPriceForFlights(outboundPrices,
                                inboundPrices, trackedFlight, waterfallCallback);
                        },
                        function(outboundPrices, inboundPrices, waterfallCallback) {
                            updateInOutPricesForFlight(outboundPrices, inboundPrices,
                                trackedFlight, waterfallCallback);
                        },
                        function(update, waterfallCallback) {
                            if (update) {
                                console.log("update was made, saving tracked flight");
                                trackedFlight.save(function(err, trackedFlight) {
                                    waterfallCallback(err);
                                });
                            } else {
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

                    // if they supplied a callback, call it (passing any errors)
                    if (callback) {
                        callback(err);
                    }
                }
            );
        });
    };

    function pageScrape(uri, callback) {
        var jqueryObject;

        // test to see if this is a mock URI
        if (process.env.TEST && uri === "mock_uri") {
            // end here, this is just test
            callback();
            return;
        }

        async.whilst(
            function() {
                // run this until we get a jquery object
                return !jqueryObject;
            },
            function(whilstCallback) {
                // scrape the site to find the item details
                request({
                    uri: uri,
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                }, function(err, response, body) {
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

        if (uri.indexOf("amazon.com") > -1) {
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
        } else if (uri.indexOf("play.google.com") > -1) {
            // crazy, but this seems to be the way to get the price of an
            // item on the google play store
            price = $(".details-actions .price").text().replace(/\s+/g, " ").split(" ")[1];

            if (!price) {
                console.error("price was not found on google play page, uri: " + uri);
                return -1;
            }

            // get the number value (remove dollar sign)
            price = +(price.slice(1));
            console.log("price: " + price);

            return price;
        } else if (uri.indexOf("bestbuy.com") > -1) {
            // best buy seems to use the same template for price
            price = $(".item-price").text().trim();

            if (!price) {
                console.error("price was not found on best buy page, uri: " + uri);
                return -1;
            }

            // get the number value (remove dollar sign)
            price = +(price.slice(1));
            console.log("price: " + price);

            return price;
        } else if (process.env.TEST && (uri == "mock_uri")) {
            // if we're in the test environment, and we have a mock uri,
            // generate a random price
            price = Math.floor(Math.random() * 100);
            return price;
        } else {
            console.error("unknown site!! " + uri);
            return -1;
        }
    }

    function findCategoryOnPage(uri, $) {
        var category;

        if (uri.indexOf("amazon.com") > -1) {
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
        } else if (uri.indexOf("play.google.com") > -1) {
            // no category support for google play
            return null;
        } else if (uri.indexOf("bestbuy.com") > -1) {
            // no category support for best buy
            return null;
        } else if (process.env.TEST && (uri == "mock_uri")) {
            // if we're in the test environment, and we have a mock uri,
            // return the mock category
            return "Mock";
        } else {
            console.error("unknown site!! " + uri);
            return null;
        }
    }

    function findNameOnPage(uri, $, category) {
        var name, selectors;

        if (uri.indexOf("amazon.com") > -1) {
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
        } else if (uri.indexOf("play.google.com") > -1) {
            // no name support for google play store
            return null;
        } else if (uri.indexOf("bestbuy.com") > -1) {
            // no name support for best buy
            return null;
        } else if (process.env.TEST && (uri == "mock_uri")) {
            // if we're in the test environment, and we have a mock uri,
            // generate a random name
            return "MockItem" + Math.floor(Math.random() * 100000);
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

    function collectFlightPrices(trackedFlight, callback) {
        var browser;

        if (trackedFlight.airline === "southwest") {
            browser = new Browser();

            // use southwest for flights
            browser.visit("http://www.southwest.com", function() {
                var today;

                // select the origin and destination airports
                browser.select("originAirport", trackedFlight.departureAirport);
                browser.select("destinationAirport", trackedFlight.arrivalAirport);

                // fill out the departure and arrival dates
                today = moment(new Date());
                browser.fill("outboundDateString", today.format("MM/DD/YYYY"));
                browser.fill("returnDateString", today.format("MM/DD/YYYY"));

                // search for flights!
                browser.pressButton("Search", function() {
                    // click the link to show prices over the course of a month
                    browser.clickLink(".shortcutNotification a", function() {
                        var outboundPrices, inboundPrices;

                        // setup the outbound and inbound price objects
                        outboundPrices = [];
                        inboundPrices = [];

                        // grab the prices for this month
                        outboundPrices.push({
                            month: today.month() + 1,
                            year: today.year(),
                            prices: browser.text(".outboundCalendar table")
                        });
                        inboundPrices.push({
                            month: today.month() + 1,
                            year: today.year(),
                            prices: browser.text(".returnCalendar table")
                        });

                        callback(null, outboundPrices, inboundPrices);
                    });
                });
            });
        } else {
            console.error("Airline not supported: " + trackedFlight.airline);
            callback("Airline not supported");
        }
    }

    function parseDateAndPriceForFlights(outboundPricesInput, inboundPricesInput, trackedFlight, callback) {
        var outboundPrices, inboundPrices, regex, datePricePairs, i,
            datePricePair, date, price;

        outboundPrices = [];
        inboundPrices = [];

        if (trackedFlight.airline === "southwest") {
            // pull the date and price out of the outbound prices input
            outboundPrices = buildDatePricePairs(outboundPricesInput);

            // now do the same for inbound prices
            inboundPrices = buildDatePricePairs(inboundPricesInput);

            callback(null, outboundPrices, inboundPrices);
        } else {
            console.error("Airline not supported: " + trackedFlight.airline);
            callback("Airline not supported");
        }
    }

    function buildDatePricePairs(prices) {
        var pricesCounter, datePricePairs, regex, month, year, pricesString,
            datesAndPrices, i, dateAndPrice, datePricePair, date, price;

        datePricePairs = [];

        // the prices are string that contain the date and the price,
        // create a regex to pull those pairs out
        regex = /\d+\s+\$\d+/g;

        for (pricesCounter = 0; pricesCounter < prices.length; pricesCounter++) {
            month = prices[pricesCounter].month;
            year = prices[pricesCounter].year;
            pricesString = prices[pricesCounter].prices;

            // pull the date and price out of the prices string
            datesAndPrices = pricesString.match(regex);
            for (i = 0; i < datesAndPrices.length; i++) {
                dateAndPrice = datesAndPrices[i];

                // separate out the date from the price
                datePricePair = dateAndPrice.split(" ");
                date = datePricePair[0];
                price = datePricePair[1];

                // format the date
                date = moment(month + "/" + date + "/" + year);

                // get the number value (remove dollar sign)
                price = +(price.slice(1));

                // add it to our date price pairs
                datePricePairs.push({
                    price: price,
                    date: date.toDate()
                });
            }
        }

        return datePricePairs;
    }

    function updateInOutPricesForFlight(outboundPrices, inboundPrices, trackedFlight, callback) {
        var update;

        // use the outbound prices to see if any prices need updating
        update = updatePricesForFlight(outboundPrices, true, trackedFlight, callback);

        // if we have no updates, keep track of the update flag
        // in either case, use the inbound prices in the same way as above
        if (!update) {
            update = updatePricesForFlight(inboundPrices, false, trackedFlight, callback);
        } else {
            updatePricesForFlight(inboundPrices, false, trackedFlight, callback);
        }

        // call the callback with our update flag
        callback(null, update);
    }

    function updatePricesForFlight(inputPrices, isOutbound, trackedFlight) {
        var update, i, inputPrice, inputPriceDate, j, existingPrice, priceDate,
            foundMatchingPriceDate;

        // track if any updates were made
        update = false;

        // loop over input prices
        for (i = 0; i < inputPrices.length; i++) {
            inputPrice = inputPrices[i];

            // translate the date to something comparable
            inputPriceDate = moment(inputPrice.date).format("MM/DD/YYYY");

            // keep track if we found a price with the same date
            foundMatchingPriceDate = false;

            // loop on all prices for this tracked flight
            for (j = 0; j < trackedFlight.prices.length; j++) {
                existingPrice = trackedFlight.prices[j];

                // only check if inbound/outbound match
                if (isOutbound !== existingPrice.isOutbound) {
                    continue;
                }

                // translate the date to something comparable
                priceDate = moment(existingPrice.date).format("MM/DD/YYYY");

                // check to see if the dates match
                if (inputPriceDate === priceDate) {
                    // we found the matching date!!
                    foundMatchingPriceDate = true;

                    // check to see if the price matches
                    if (inputPrice.price === existingPrice.price) {
                        // we found the same price... do nothing...
                    } else {
                        // we found a new price!
                        update = true;
                        console.log("new price found: " + inputPrice.price +
                            " for date: " + priceDate);

                        // add the existing price to the past price
                        existingPrice.pastPrices.splice(0, 0, {
                            price: existingPrice.price,
                            dateEstablished: existingPrice.dateEstablished
                        });

                        // update the new price
                        existingPrice.price = inputPrice.price;
                        existingPrice.dateEstablished = new Date();
                    }
                } // else just move on to the next...
            }

            // if at the end, we've found no matching date, create a new price
            if (!foundMatchingPriceDate) {
                console.log("no existing price found for date: " + inputPrice.date +
                    " adding new price: " + inputPrice.price);
                trackedFlight.prices.push({
                    price: inputPrice.price,
                    date: inputPrice.date,
                    dateEstablished: new Date(),
                    isOutbound: isOutbound
                });

                update = true;
            }
        }

        return update;
    }
}

module.exports = new PriceUpdater();
