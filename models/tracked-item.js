"use strict";

var mongoose = require("mongoose"),
    Schema = mongoose.Schema,
    Price = require("./price");

var TrackedItemSchema = new Schema({
    name: {
        type: String
    },
    category: {
        type: String
    },
    subcategory: {
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

TrackedItemSchema.pre("remove", function(next) {
    var Price = mongoose.model("Price");
    // don't forget to remove the connected prices!
    Price.find({
        trackedItem: this
    }, function(err, prices) {
        var i;

        if (err) {
            next(err);
        }

        for (i=0; i<prices.length; i++) {
            prices[i].remove();
        }
        next();
    });
});

mongoose.model("TrackedItem", TrackedItemSchema);
