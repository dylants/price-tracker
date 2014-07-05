"use strict";

var Duration = require("duration"),
    mongoose = require("mongoose"),
    Status = mongoose.model("Status");

module.exports = function(app) {
    app.namespace("/api", function() {
        app.get("/status-ui", function(req, res) {
            Status.findOne(function(err, status) {
                var statusUI, duration;

                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                status = status.toJSON();
                statusUI = {};
                statusUI.lastUpdate = status.lastUpdateStart;
                duration = new Duration(status.lastUpdateStart, status.lastUpdateEnd);
                statusUI.lastUpdateDuration = duration.toString(1, 1);

                res.send(statusUI);
            });
        });
    });
};
