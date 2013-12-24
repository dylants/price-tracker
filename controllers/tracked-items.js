var mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/tracked-items", function(req, res) {
            TrackedItem.find(function(err, trackedItems) {
                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                res.send(trackedItems);
            });
        });

        app.get("/tracked-items/update", function(req, res) {
            var priceUpdater = require("../lib/price-updater");

            priceUpdater.updateTrackedItems(function(err) {
                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                res.send("done!");
            });
        });
    });
};
