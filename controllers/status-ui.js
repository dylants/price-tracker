var mongoose = require("mongoose"),
    Status = mongoose.model("Status");

module.exports = function(app) {
    app.namespace("/api", function() {
        app.get("/status-ui", function(req, res) {
            Status.findOne(function(err, status) {
                var statusUI;

                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                statusUI = status.toJSON();

                // compute the minutes
                statusUI.lastUpdateDurationMinutes =
                    Math.floor(statusUI.lastUpdateDurationInSeconds / 60);

                // compute the seconds
                statusUI.lastUpdateDurationSeconds =
                    statusUI.lastUpdateDurationInSeconds % 60;
                // don't let the seconds be a single digit
                if (statusUI.lastUpdateDurationSeconds < 10) {
                    statusUI.lastUpdateDurationSeconds = "0" + statusUI.lastUpdateDurationSeconds;
                }

                res.send(statusUI);
            });
        });
    });
};
