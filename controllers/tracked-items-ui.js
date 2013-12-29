var mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/tracked-items-ui", function(req, res) {
            TrackedItem.find().populate("prices").exec(function(err, trackedItems) {
                var trackedItemsUI, i, trackedItem, category;

                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                // create an object that contains all the tracked items, but keyed
                // off the category of those items
                trackedItemsUI = {};

                for (i = 0; i < trackedItems.length; i++) {
                    trackedItem = trackedItems[i];
                    category = trackedItem.category;

                    if (!trackedItemsUI[category]) {
                        trackedItemsUI[category] = [];
                    }
                    trackedItemsUI[category].push(generateTrackedItemUI(trackedItem));
                }

                res.send(trackedItemsUI);
            });
        });

    });
};

function generateTrackedItemUI(trackedItem) {
    var trackedItemUI, i;

    trackedItemUI = {};
    trackedItemUI.name = trackedItem.name;
    // does this tracked item has a price?
    if (trackedItem.prices.length > 0) {
        trackedItemUI.currentPrice = trackedItem.prices[0].price;
        trackedItemUI.currentPriceUri = trackedItem.prices[0].uri;
        trackedItemUI.currentPriceDate = trackedItem.prices[0].dateEstablished;

        // what about any past prices?
        trackedItemUI.pastPrices = [];
        if (trackedItem.prices.length > 1) {
            for (i = 1; i < trackedItem.prices.length; i++) {
                trackedItemUI.pastPrices.push({
                    price: trackedItem.prices[i].price,
                    uri: trackedItem.prices[i].uri,
                    date: trackedItem.prices[i].dateEstablished
                });
            }
        }
    }

    return trackedItemUI;
}
