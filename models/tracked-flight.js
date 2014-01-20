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
        }
    }]
});

mongoose.model("TrackedFlight", TrackedFlightSchema);
