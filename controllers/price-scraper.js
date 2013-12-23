var scraper = require("scraper"),
    async = require("async");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/price-scraper", function(req, res) {
            var config, count, pricesNow;

            config = app.get("config");
            pricesNow = [];

            count = 0;
            async.whilst(
                function() {
                    return count < config.length;
                },
                function(whilstCallback) {
                    var trackedItem;

                    trackedItem = config[count];
                    count++;

                    scraper({
                        uri: trackedItem.uris[0]
                    }, function(err, $) {
                        var price, priceNow;

                        if (err) {
                            console.error(err);
                            res.send(500, {
                                error: err
                            });
                            return;
                        }

                        // TODO assume amazon
                        price = $("#actualPriceValue");
                        if (!price || price.length < 1) {
                            console.error("actual price not found!");
                            res.send(500, {
                                error: "actual price not found!"
                            });
                            return;
                        }

                        // pull the price from the website
                        price = $(price[0]).text().trim();
                        console.log("price: " + price);

                        // get the number value (remove dollar sign)
                        price = +(price.slice(1));

                        priceNow = {
                            name: trackedItem.name,
                            price: price
                        };

                        if (trackedItem.bestPrice.price != price) {
                            priceNow.newPrice = true;
                        } else {
                            priceNow.newPrice = false;
                        }

                        pricesNow.push(priceNow);

                        whilstCallback(null);
                    });
                },
                function(err) {
                    res.send(pricesNow);
                }
            );

        });
    });
};
