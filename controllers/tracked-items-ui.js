var priceUpdater = require("../lib/price-updater"),
    _ = require("underscore"),
    moment = require("moment"),
    mongoose = require("mongoose"),
    TrackedItem = mongoose.model("TrackedItem"),
    Price = mongoose.model("Price");

module.exports = function(app) {
    app.namespace("/api", function() {

        app.get("/tracked-items-ui", function(req, res) {
            TrackedItem.find().populate("prices").exec(function(err, trackedItems) {
                var trackedItemsUI, i, trackedItemUI, trackedItem, category, subcategory;

                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                trackedItemsUI = [];

                for (i = 0; i < trackedItems.length; i++) {
                    trackedItem = trackedItems[i].toJSON();
                    category = trackedItem.category;
                    subcategory = trackedItem.subcategory;

                    // find the matching tracked item UI
                    trackedItemUI = findTrackedItemUIByCategory(category, trackedItemsUI);

                    // setup this category if it doesn't yet exist
                    if (!trackedItemUI) {
                        trackedItemUI = {};
                        trackedItemUI.category = category;
                        trackedItemUI.trackedItems = [];
                        trackedItemUI.hasSubcategories = false;
                        trackedItemsUI.push(trackedItemUI);
                    }

                    // note if this category has subcategories
                    if (subcategory) {
                        trackedItemUI.hasSubcategories = true;
                    }

                    // add the tracked item UI
                    trackedItemUI.trackedItems.push(
                        generateTrackedItemUI(trackedItem));
                }

                // sort the tracked items UI alphabetically by category
                trackedItemsUI.sort(function(tiUIA, tiUIB) {
                    if (tiUIA.category > tiUIB.category) {
                        return 1;
                    } else if (tiUIA.category < tiUIB.category) {
                        return -1;
                    } else {
                        return 0;
                    }
                });

                // sort the tracked items that are within subcategories
                trackedItemsUI.forEach(function(trackedItemUI) {
                    var hasSubcategories;

                    hasSubcategories = trackedItemUI.hasSubcategories;
                    // only do this sorting if subcategories exist
                    if (hasSubcategories) {
                        // sort so the tracked items with a subcategory appear
                        // earlier in the array than those without, so in the end
                        // those without a subcategory in a category with subcategories
                        // appear at the end of the array.
                        // 
                        // Also sort the subcategories alphabetically
                        trackedItemUI.trackedItems.sort(function(tiA, tiB) {
                            if (tiA.subcategory && !tiB.subcategory) {
                                return -1;
                            } else if (!tiA.subcategory && tiB.subcategory) {
                                return 1;
                            } else if (tiA.subcategory > tiB.subcategory) {
                                return 1;
                            } else if (tiA.subcategory < tiB.subcategory) {
                                return -1;
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
                if (trackedItem === null) {
                    res.send(404);
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
                        trackedItem: trackedItem,
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
                if (trackedItem === null) {
                    res.send(404);
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
            // we have a middleware hooked up to perform additional operations
            // when we remove a tracked item. Mongoose only supports calling
            // middleware when a document invokes the action. So because of this,
            // we must first find the object, then call remove on the Document,
            // not a one-stop using the Model.
            TrackedItem.findById(req.params.id, function(err, trackedItem) {
                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }

                // if the tracked item did not exist, respond with 404
                if (trackedItem === null) {
                    res.send(404);
                } else {
                    trackedItem.remove(function(err) {
                        if (err) {
                            console.error(err);
                            res.send(500);
                            return;
                        }
                        res.send(200, {});
                    });
                }
            });
        });
    });
};

function findTrackedItemUIByCategory(category, trackedItemsUI) {
    var i;

    for (i = 0; i < trackedItemsUI.length; i++) {
        if (trackedItemsUI[i].category === category) {
            return trackedItemsUI[i];
        }
    }

    return null;
}

function generateTrackedItemUI(trackedItem) {
    var trackedItemUI, duration, i;

    trackedItemUI = {};
    trackedItemUI.id = trackedItem._id;
    trackedItemUI.name = trackedItem.name;
    trackedItemUI.category = trackedItem.category;
    trackedItemUI.subcategory = trackedItem.subcategory ? trackedItem.subcategory : "";
    // does this tracked item has a price?
    if (trackedItem.prices.length > 0) {
        trackedItemUI.currentPrice = {};
        trackedItemUI.currentPrice.price = trackedItem.prices[0].price;
        trackedItemUI.currentPrice.uri = trackedItem.prices[0].uri;
        trackedItemUI.currentPrice.date = trackedItem.prices[0].dateEstablished;
        // calculate the duration of time this price has existed
        if (trackedItem.prices.length > 1) {
            // there was a previous price
            duration = moment.duration(trackedItem.prices[1].dateEstablished.valueOf() -
                trackedItem.prices[0].dateEstablished.valueOf()).humanize();
            if (duration === "a day") {
                duration = "1 day";
            }
            trackedItemUI.currentPrice.duration = duration;
        } else {
            // there was no previous price, this is the first
            trackedItemUI.currentPrice.duration = null;
        }

        // what about any past prices?
        trackedItemUI.pastPrices = [];
        if (trackedItem.prices.length > 1) {
            for (i = 1; i < trackedItem.prices.length; i++) {
                if (trackedItem.prices.length > i + 1) {
                    // there was a previous, previous price
                    duration = moment.duration(trackedItem.prices[i + 1].dateEstablished.valueOf() -
                        trackedItem.prices[i].dateEstablished.valueOf()).humanize();
                    if (duration === "a day") {
                        duration = "1 day";
                    }
                } else {
                    // there was no previous, previous price
                    duration = null;
                }
                trackedItemUI.pastPrices.push({
                    price: trackedItem.prices[i].price,
                    uri: trackedItem.prices[i].uri,
                    date: trackedItem.prices[i].dateEstablished,
                    duration: duration
                });
            }
        }
    }

    return trackedItemUI;
}
