var mongoose = require("mongoose"),
    Schema = mongoose.Schema,
    TrackedItem = require("./tracked-item");

var PriceSchema = new Schema({
    trackedItem: {
        type: mongoose.Schema.ObjectId,
        ref: "TrackedItem"
    },
    price: {
        type: Number
    },
    uri: {
        type: String
    },
    dateEstablished: {
        type: Date
    }
});

mongoose.model("Price", PriceSchema);
