var Browser = require("zombie"),
    moment = require("moment"),
    phantom = require("phantom");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/flights", function(req, res) {
            var browser = new Browser();

            // use southwest for flights
            browser.visit("http://www.southwest.com", function() {
                var today;

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
                        var result;

                        result = {};
                        result.outboundPrices = browser.text(".outboundCalendar table");
                        result.inboundPrices = browser.text(".returnCalendar table");
                        res.send(result);
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
    });
};
