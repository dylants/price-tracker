var mongoose = require("mongoose"),
    Schema = mongoose.Schema
    Price = require("./price");

var TrackedItemSchema = new Schema({
    name: {
        type: String
    },
    category: {
        type: String
    },
    uris: {
        type: Array
    },
    prices: [{
        type: mongoose.Schema.ObjectId,
        ref: "Price"
    }]
});

mongoose.model("TrackedItem", TrackedItemSchema);
