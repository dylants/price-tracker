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
                statusUI.lastUpdateDurationMinutes =
                    Math.floor(statusUI.lastUpdateDurationInSeconds / 60);
                statusUI.lastUpdateDurationSeconds =
                    statusUI.lastUpdateDurationInSeconds % 60;

                res.send(statusUI);
            });
        });
    });
};
