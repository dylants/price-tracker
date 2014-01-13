var mongoose = require("mongoose"),
    Schema = mongoose.Schema;

var StatusSchema = new Schema({
    lastUpdate: {
        type: Date
    },
    lastUpdateDurationInSeconds: {
        type: Number
    }
});

mongoose.model("Status", StatusSchema);
