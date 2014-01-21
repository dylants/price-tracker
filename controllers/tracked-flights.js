var priceUpdater = require("../lib/price-updater"),
    mongoose = require("mongoose"),
    TrackedFlight = mongoose.model("TrackedFlight");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/tracked-flights", function(req, res) {
            TrackedFlight.find(function(err, trackedFlights) {
                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                res.send(trackedFlights);
            });
        });

        app.get("/tracked-flights/update", function(req, res) {
            console.log("Manual trigger of price update");
            // issue the request in the background, returning immediately
            priceUpdater.updateTrackedFlights();
            res.send("update requested");
        });
    });
};
