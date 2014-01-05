var priceUpdater = require("../lib/price-updater"),
    _ = require("underscore"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem"),
    Price = mongoose.model("Price");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/tracked-items-ui", function(req, res) {
            TrackedItem.find().populate("prices").exec(function(err, trackedItems) {
                var trackedItemsUI, i, trackedItem, category, subcategory, categories;

                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                trackedItemsUI = {};

                for (i = 0; i < trackedItems.length; i++) {
                    trackedItem = trackedItems[i];
                    category = trackedItem.category;
                    subcategory = trackedItem.subcategory;

                    // setup this category if it doesn't yet exist
                    if (!trackedItemsUI[category]) {
                        trackedItemsUI[category] = {};
                        trackedItemsUI[category].trackedItems = [];
                        trackedItemsUI[category].hasSubcategories = false;
                    }

                    // note if this category has subcategories
                    if (subcategory) {
                        trackedItemsUI[category].hasSubcategories = true;
                    }

                    // add the tracked item UI
                    trackedItemsUI[category].trackedItems.push(
                        generateTrackedItemUI(trackedItem));
                }

                // sort the tracked items that are within subcategories
                categories = _.keys(trackedItemsUI);
                categories.forEach(function(category) {
                    var hasSubcategories;

                    hasSubcategories = trackedItemsUI[category].hasSubcategories;
                    // only do this sorting if subcategories exist
                    if (hasSubcategories) {
                        // sort so the tracked items with a subcategory appear
                        // earlier in the array than those without, so in the end
                        // those without a subcategory in a category with subcategories
                        // appear at the end of the array.
                        trackedItemsUI[category].trackedItems.sort(function(tiA, tiB) {
                            if (tiA.subcategory && !tiB.subcategory) {
                                return -1;
                            } else if (!tiA.subcategory && tiB.subcategory) {
                                return 1;
                            } else {
                                return 0;
                            }
                        });
                    }
                });

                res.send(trackedItemsUI);
            });
        });

        app.get("/tracked-items-ui/:id", function(req, res) {
            TrackedItem.findById(req.params.id).populate("prices").exec(function(err, trackedItem) {
                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                res.send(generateTrackedItemUI(trackedItem));
            });
        });

        app.post("/tracked-items-ui", function(req, res) {
            var uri, name, category, subcategory, price, trackedItem;

            // gather information from request body
            uri = req.body.uri;
            name = req.body.name;
            category = req.body.category;
            subcategory = req.body.subcategory;
            price = req.body.price;

            // check to see if this POST has all the required information
            if (name && category && price && uri) {
                // create a new tracked item
                trackedItem = new TrackedItem({
                    name: name,
                    category: category,
                    subcategory: subcategory,
                    uris: [uri]
                });
                trackedItem.save(function(err, trackedItem) {
                    var priceModel;

                    if (err) {
                        console.error(err);
                        res.send(500);
                        return;
                    }

                    // create a price
                    priceModel = new Price({
                        price: price,
                        uri: uri,
                        dateEstablished: new Date()
                    });
                    priceModel.save(function(err, priceModel) {
                        if (err) {
                            console.error(err);
                            res.send(500);
                            return;
                        }

                        // add the price to our tracked item
                        trackedItem.prices.push(priceModel);
                        trackedItem.save(function(err, trackedItem) {
                            if (err) {
                                console.error(err);
                                res.send(500);
                                return;
                            }

                            res.send(201, trackedItem);
                        });
                    });
                });
            } else {
                // assume this is just a request to gather item details
                priceUpdater.gatherItemDetails(uri, function(err, itemDetails) {
                    if (err) {
                        console.error(err);
                        res.send(500);
                        return;
                    }

                    res.send(200, itemDetails);
                });
            }
        });

        app.patch("/tracked-items-ui/:id", function(req, res) {
            TrackedItem.findById(req.params.id, function(err, trackedItem) {
                var name, category, subcategory, update;

                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                // currently we support updating the name, category, and
                // subcategory only
                name = req.body.name;
                category = req.body.category;
                subcategory = req.body.subcategory;

                if (name && trackedItem.name !== name) {
                    console.log("updating name of tracked item to: " + name);
                    trackedItem.name = name;
                    update = true;
                }
                if (category && trackedItem.category !== category) {
                    console.log("updating category of tracked item to: " + category);
                    trackedItem.category = category;
                    update = true;
                }
                if (subcategory && trackedItem.subcategory !== subcategory) {
                    console.log("updating subcategory of tracked item to: " + subcategory);
                    trackedItem.subcategory = subcategory;
                    update = true;
                }

                if (update) {
                    trackedItem.save(function(err, trackedItem) {
                        if (err) {
                            console.error(err);
                            res.send(500);
                            return;
                        }

                        res.send(200, trackedItem);
                    });
                } else {
                    console.log("no changes found to be made, ignoring");
                    res.send(200, trackedItem);
                }
            });
        });

        app.delete("/tracked-items-ui/:id", function(req, res) {
            TrackedItem.findByIdAndRemove(req.params.id, function(err, trackedItem) {
                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                // with no errors, respond with success if the trackedItem existed
                if (trackedItem === null) {
                    res.send(404);
                } else {
                    res.send(200, {});
                }
            });
        });
    });
};

function generateTrackedItemUI(trackedItem) {
    var trackedItemUI, i;

    trackedItemUI = {};
    trackedItemUI.id = trackedItem.id;
    trackedItemUI.name = trackedItem.name;
    trackedItemUI.category = trackedItem.category;
    trackedItemUI.subcategory = trackedItem.subcategory ? trackedItem.subcategory : "";
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
