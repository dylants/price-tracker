var async = require("async"),
    PriceFinder = require("price-finder"),
    moment = require("moment"),
    Browser = require("zombie"),
    utils = require("./utils"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem"),
    Price = mongoose.model("Price"),
    Status = mongoose.model("Status"),
    TrackedFlight = mongoose.model("TrackedFlight");

// The minimum amount of difference percentage wise that a price
// has to change to require an update in the price. Percentage is
// calculated from 0 - 1, with 1 = 100% and 0 = 0%. So .10 = 10%
var MIN_PERCENTAGE_CHANGE_NEEDED_TO_UPDATE = 0.10;

// Flight types
var FLIGHT_TYPE_ROUND_TRIP = "ROUND-TRIP",
    FLIGHT_TYPE_ONE_WAY = "ONE-WAY";

function PriceUpdater() {

    var priceFinder = new PriceFinder();
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
                        },
                        function(waterfallCallback) {
                            // before finding details on the next tracked item,
                            // sleep anywhere between 1 minute and 30 minutes in
                            // an attempt (which maybe futile) to make ourselves
                            // look less robotic to websites
                            var sleepTime = utils.generateNum(60000, 1800000);
                            console.log("sleeping for " + sleepTime + " milliseconds");
                            setTimeout(function() {
                                waterfallCallback();
                            }, sleepTime);
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
        priceFinder.findItemDetails(uri, function(err, itemDetails) {
            callback(err, itemDetails);
        });
    };

    /**
     * Loops over all tracked flights, updating the prices found today with those
     * found in the past. This does so by scraping the website for prices, parsing
     * those prices into dates, and updating the tracked flight prices.
     *
     * The tracked flight's airline is used to determine where/how to scrape for
     * price information. The departureAirport and arrivalAirport are used to
     * find the correct flights, and the flightType is used to determine if
     * return flight prices should be included.
     *
     * @param  {Function} callback (Optional) callback to be called when execution
     *                             is complete. Called with possible error object
     *                             as first argument
     */
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
                        function(prices, waterfallCallback) {
                            parseDateAndPriceForFlights(prices, trackedFlight, waterfallCallback);
                        },
                        function(prices, waterfallCallback) {
                            updatePricesForFlight(prices, trackedFlight, waterfallCallback);
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
        var browser, uri;

        if (trackedFlight.airline === "southwest") {
            browser = new Browser();

            // use southwest for flights
            uri = "http://www.southwest.com";

            browser.visit(uri, function() {
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
                        var prices;

                        prices = [];

                        // grab the prices for this month
                        prices.push({
                            month: today.month() + 1,
                            year: today.year(),
                            prices: browser.text(".outboundCalendar table"),
                            isOutbound: true,
                            uri: uri
                        });
                        // if it's a round trip flight, collect the return information
                        if (trackedFlight.flightType === FLIGHT_TYPE_ROUND_TRIP) {
                            prices.push({
                                month: today.month() + 1,
                                year: today.year(),
                                prices: browser.text(".returnCalendar table"),
                                isOutbound: false,
                                uri: uri
                            });
                        }

                        callback(null, prices);
                    });
                });
            });
        } else {
            console.error("Airline not supported: " + trackedFlight.airline);
            callback("Airline not supported");
        }
    }

    function parseDateAndPriceForFlights(pricesInput, trackedFlight, callback) {
        var prices, regex, pricesCounter, month, year, isOutbound, uri, pricesString,
            datesAndPrices, i, dateAndPrice, datePricePair, date, price;

        if (trackedFlight.airline === "southwest") {
            prices = [];

            // the prices are string that contain the date and the price,
            // create a regex to pull those pairs out
            regex = /\d+\s+\$\d+/g;

            for (pricesCounter = 0; pricesCounter < pricesInput.length; pricesCounter++) {
                month = pricesInput[pricesCounter].month;
                year = pricesInput[pricesCounter].year;
                isOutbound = pricesInput[pricesCounter].isOutbound;
                uri = pricesInput[pricesCounter].uri;
                pricesString = pricesInput[pricesCounter].prices;

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
                    prices.push({
                        price: price,
                        date: date.toDate(),
                        isOutbound: isOutbound,
                        uri: uri
                    });
                }
            }

            callback(null, prices);
        } else {
            console.error("Airline not supported: " + trackedFlight.airline);
            callback("Airline not supported");
        }
    }

    function updatePricesForFlight(inputPrices, trackedFlight, callback) {
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
                if (inputPrice.isOutbound !== existingPrice.isOutbound) {
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
                            dateEstablished: existingPrice.dateEstablished,
                            uri: existingPrice.uri
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
                    isOutbound: inputPrice.isOutbound,
                    uri: inputPrice.uri
                });

                update = true;
            }
        }

        // if there was an update, save the tracked flight
        if (update) {
            console.log("update was made, saving tracked flight");
            trackedFlight.save(function(err) {
                callback(err);
            });
        } else {
            // else just call the callback
            callback();
        }
    }
}

module.exports = new PriceUpdater();
