var moment = require("moment"),
    mongoose = require("mongoose"),
    TrackedFlight = mongoose.model("TrackedFlight");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/tracked-flights-ui", function(req, res) {
            var trackedFlightsUI, today, beginningOfMonth;

            trackedFlightsUI = {};

            trackedFlightsUI.months = [];

            today = moment(new Date());
            beginningOfMonth = moment((today.month() + 1) + "/01/" + today.year());

            trackedFlightsUI.months.push(buildMonth(beginningOfMonth));

            res.send(trackedFlightsUI);
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
