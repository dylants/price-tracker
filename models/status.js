"use strict";

var mongoose = require("mongoose"),
    Schema = mongoose.Schema;

var StatusSchema = new Schema({
    lastUpdateStart: {
        type: Date
    },
    lastUpdateEnd: {
        type: Date
    }
});

mongoose.model("Status", StatusSchema);
