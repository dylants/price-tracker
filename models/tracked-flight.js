var mongoose = require("mongoose"),
    Schema = mongoose.Schema;

var TrackedFlightSchema = new Schema({
    airline: {
        type: String
    },
    departureAirport: {
        type: String
    },
    arrivalAirport: {
        type: String
    },
    flightType: {
        type: String
    },
    prices: [{
        price: {
            type: Number
        },
        date: {
            type: Date
        },
        dateEstablished: {
            type: Date
        },
        isOutbound: {
            type: Boolean
        },
        uri: {
            type: String
        },
        pastPrices: [{
            price: {
                type: Number
            },
            dateEstablished: {
                type: Date
            },
            uri: {
                type: String
            }
        }]
    }]
});

mongoose.model("TrackedFlight", TrackedFlightSchema);
