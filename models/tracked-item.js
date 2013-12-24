var mongoose = require("mongoose"),
    Schema = mongoose.Schema;

var TrackedItemSchema = new Schema({
    name: {
        type: String
    },
    uris: {
        type: Array
    },
    bestPrice: {
        type: Number
    },
    bestPriceUri: {
        type: String
    },
    bestPriceDate: {
        type: Date
    }
});

mongoose.model("TrackedItem", TrackedItemSchema);
