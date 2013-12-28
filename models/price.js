var mongoose = require("mongoose"),
    Schema = mongoose.Schema;

var PriceSchema = new Schema({
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
