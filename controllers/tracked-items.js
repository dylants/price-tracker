"use strict";

var priceUpdater = require("../lib/price-updater"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/tracked-items", function(req, res) {
            TrackedItem.find().populate("prices").exec(function(err, trackedItems) {
                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                res.send(trackedItems);
            });
        });

        app.get("/tracked-items/update", function(req, res) {
            console.log("Manual trigger of price update");
            // issue the request in the background, returning immediately
            priceUpdater.updateTrackedItems();
            res.send("update requested");
        });
    });
};
