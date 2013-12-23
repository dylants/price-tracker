var scraper = require("scraper");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/price-scraper", function(req, res) {

            scraper({
                uri: "http://www.amazon.com/Harvest-Moon/dp/B002A6Z9S0"
            }, function(err, $) {
                var price;

                if (err) {
                    console.error(err);
                    res.send(500, {
                        error: err
                    });
                    return;
                }

                price = $("#actualPriceValue");
                if (!price || price.length < 1) {
                    console.error("actual price not found!");
                    res.send(500, {
                        error: "actual price not found!"
                    });
                    return;
                }

                price = $(price[0]).text().trim();
                console.log("price: " + price);
                res.send("price: " + price);
            });

        });
    });
};
