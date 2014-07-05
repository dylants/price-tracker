"use strict";

/* globals $:false, document:false */

var priceUpdater = require("../lib/price-updater"),
    Browser = require("zombie"),
    moment = require("moment"),
    phantom = require("phantom"),
    mongoose = require("mongoose"),
    TrackedFlight = mongoose.model("TrackedFlight");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/flights", function(req, res) {
            var browser = new Browser();

            // use southwest for flights
            browser.visit("http://www.southwest.com", function() {
                var results, today;

                results = {};
                results.outboundPrices = [];
                results.inboundPrices = [];

                // select the origin and destination airports
                browser.select("originAirport", "AUS");
                browser.select("destinationAirport", "SJC");

                // fill out the departure and arrival dates
                today = moment(new Date());
                browser.fill("outboundDateString", today.format("MM/DD/YYYY"));
                browser.fill("returnDateString", today.format("MM/DD/YYYY"));

                // search for flights!
                browser.pressButton("Search", function() {
                    // click the link to show prices over the course of a month
                    browser.clickLink(".shortcutNotification a", function() {
                        // record the prices for this month
                        results.outboundPrices.push(browser.text(".outboundCalendar table"));
                        results.inboundPrices.push(browser.text(".returnCalendar table"));

                        // move on to the next month
                        browser.clickLink(".carouselEnabledSodaIneligible a", function() {
                            var uri, month;

                            // record the prices for this month
                            results.outboundPrices.push(browser.text(".outboundCalendar table"));
                            results.inboundPrices.push(browser.text(".returnCalendar table"));

                            // build the URI for the next month
                            uri = browser.location.href;
                            uri = uri.slice(0, uri.indexOf("outboundMonth"));
                            month = today.add("months", 2).format("M");
                            uri = uri + "outboundMonth=" + month +
                                "&inboundMonth=" + month + "&selectedOutboundDate=&selectedInboundDate=";

                            // move to the next month
                            browser.location = uri;
                            browser.wait(function() {
                                // record the prices for this month
                                results.outboundPrices.push(browser.text(".outboundCalendar table"));
                                results.inboundPrices.push(browser.text(".returnCalendar table"));

                                // return the results
                                res.send(results);
                            });
                        });
                    });
                });
            });
        });

        app.get("flights-phantom", function(req, res) {
            phantom.create(function(ph) {
                ph.createPage(function(page) {
                    page.open("http://www.southwest.com", function(status) {
                        var today;

                        today = moment(new Date());
                        page.evaluate(function(today) {
                            $("#originAirport").val("AUS");
                            $("#destinationAirport").val("SJC");

                            $("#outboundDateAir").val(today);
                            $("#returnDateAir").val(today);

                            $("#booking_widget_content_row_btn_search").click();
                        }, function() {
                            setTimeout(function() {
                                page.evaluate(function() {
                                    $(".shortcutNotification a")[0].click();
                                }, function() {
                                    setTimeout(function() {
                                        page.evaluate(function() {
                                            return document.title;
                                        }, function(title) {
                                            res.send("title is!: " + title);
                                            ph.exit();
                                        });
                                    }, 3000);
                                });
                            }, 2000);
                        }, today.format("MM/DD/YYYY"));
                    });
                });
            });
        });

        app.get("/flights/add-flight", function(req, res) {
            var trackedFlight;

            trackedFlight = new TrackedFlight({
                airline: "southwest",
                departureAirport: "AUS",
                arrivalAirport: "SJC",
                flightType: "ROUND-TRIP"
            });
            trackedFlight.save();
            res.send("done!");
        });

        app.get("/flights/update", function(req, res) {
            console.log("Manual trigger of price update");
            // issue the request in the background, returning immediately
            priceUpdater.updateTrackedFlights();
            res.send("update requested");
        });
    });
};
