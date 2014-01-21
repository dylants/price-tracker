var moment = require("moment"),
    mongoose = require("mongoose"),
    TrackedFlight = mongoose.model("TrackedFlight");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/tracked-flights-ui", function(req, res) {
            var trackedFlightsUI, today, beginningOfMonth;

            trackedFlightsUI = {};

            // add calendar months to our UI result object
            trackedFlightsUI.months = [];
            today = moment(new Date());
            beginningOfMonth = moment((today.month() + 1) + "/01/" + today.year());

            // add the current month
            trackedFlightsUI.months.push(buildMonth(beginningOfMonth));

            // add tracked flight prices
            TrackedFlight.find(function(err, trackedFlights) {
                var i, trackedFlight, j, price, date, priceString;

                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                trackedFlightsUI.prices = {};

                // loop over all the tracked flights
                for (i = 0; i < trackedFlights.length; i++) {
                    trackedFlight = trackedFlights[i].toJSON();

                    // loop over all the prices for this tracked flight
                    for (j = 0; j < trackedFlight.prices.length; j++) {
                        price = trackedFlight.prices[j];

                        // create a simple date string
                        date = (price.date.getMonth() + 1) + "-" +
                            price.date.getDate() + "-" +
                            price.date.getFullYear();

                        // create a price string for this date
                        if (price.isOutbound) {
                            priceString = trackedFlight.departureAirport + "→" +
                                trackedFlight.arrivalAirport + " $" +
                                price.price;
                        } else {
                            priceString = trackedFlight.arrivalAirport + "→" +
                                trackedFlight.departureAirport + " $" +
                                price.price;
                        }

                        // if no prices exist for that date, initialize the array
                        if (!trackedFlightsUI.prices[date]) {
                            trackedFlightsUI.prices[date] = [];
                        }

                        // add the price string for that date
                        trackedFlightsUI.prices[date].push(priceString);
                    }
                }

                // with everything done, return our UI result object
                res.send(trackedFlightsUI);
            });
        });
    });
};

function buildMonth(beginningOfMonth) {
    var monthName, monthNumber, weeks, days, currentDay, i, weekNumber;

    monthName = beginningOfMonth.format("MMMM");
    monthNumber = beginningOfMonth.month();

    weeks = [];
    days = [];
    currentDay = beginningOfMonth;

    // add placeholders for the days of the previous month
    for (i = 0; i < currentDay.day(); i++) {
        days.push(null);
    }
    // add the days for the rest of the week
    for (i = currentDay.day(); i < 7; i++) {
        days.push(currentDay.date());
        currentDay.add("days", 1);
    }

    // add the first week
    weekNumber = 1;
    weeks.push({
        weekNumber: weekNumber,
        days: days
    });

    // add the remaining weeks
    while (currentDay.month() === monthNumber) {
        weekNumber++;
        addDays(currentDay, weekNumber, weeks);
    }

    return {
        monthName: monthName,
        weeks: weeks
    };
}

function addDays(currentDay, weekNumber, weeks) {
    var monthNumber, days, i;

    monthNumber = currentDay.month();
    days = [];
    for (i = currentDay.day(); i < 7; i++) {
        // only add the date if we're still in the current month
        if (currentDay.month() === monthNumber) {
            days.push(currentDay.date());
        } else {
            days.push(null);
        }
        currentDay.add("days", 1);
    }
    // add the first week
    weeks.push({
        weekNumber: weekNumber,
        days: days
    });
}
