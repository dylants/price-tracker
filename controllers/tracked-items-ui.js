"use strict";

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

                // sort the tracked items within each tracked items UI
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
                            } else if (tiA.subcategory === tiB.subcategory) {
                                // sort the items alphabetically
                                if (tiA.name > tiB.name) {
                                    return 1;
                                } else if (tiA.name < tiB.name) {
                                    return -1;
                                } else {
                                    return 0;
                                }
                            } else {
                                return 0;
                            }
                        });
                    } else {
                        // sort the tracked items alphabetically
                        trackedItemUI.trackedItems.sort(function(tiA, tiB) {
                            if (tiA.name > tiB.name) {
                                return 1;
                            } else if (tiA.name < tiB.name) {
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
                var name, category, subcategory, uri1, uri2, uri3, uri4, uri5, update;

                if (err) {
                    console.error(err);
                    res.send(500);
                    return;
                }
                if (trackedItem === null) {
                    res.send(404);
                    return;
                }

                name = req.body.name;
                category = req.body.category;
                subcategory = req.body.subcategory;
                uri1 = req.body.uri1;
                uri2 = req.body.uri2;
                uri3 = req.body.uri3;
                uri4 = req.body.uri4;
                uri5 = req.body.uri5;

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

                // if there's a URI, update all URIs
                if (uri1) {
                    console.log("updating tracked item uri1: " + uri1);
                    trackedItem.uris = [];
                    trackedItem.uris.push(uri1);
                    if (uri2) {
                        console.log("updating tracked item uri2: " + uri2);
                        trackedItem.uris.push(uri2);
                    }
                    if (uri3) {
                        console.log("updating tracked item uri3: " + uri3);
                        trackedItem.uris.push(uri3);
                    }
                    if (uri4) {
                        console.log("updating tracked item uri4: " + uri4);
                        trackedItem.uris.push(uri4);
                    }
                    if (uri5) {
                        console.log("updating tracked item uri5: " + uri5);
                        trackedItem.uris.push(uri5);
                    }
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
    trackedItemUI.uri1 = trackedItem.uris[0] ? trackedItem.uris[0] : "";
    trackedItemUI.uri2 = trackedItem.uris[1] ? trackedItem.uris[1] : "";
    trackedItemUI.uri3 = trackedItem.uris[2] ? trackedItem.uris[2] : "";
    trackedItemUI.uri4 = trackedItem.uris[3] ? trackedItem.uris[3] : "";
    trackedItemUI.uri5 = trackedItem.uris[4] ? trackedItem.uris[4] : "";
    // does this tracked item has a price?
    if (trackedItem.prices.length > 0) {
        trackedItemUI.currentPrice = {};
        trackedItemUI.currentPrice.price = trackedItem.prices[0].price;
        trackedItemUI.currentPrice.uri = trackedItem.prices[0].uri;
        trackedItemUI.currentPrice.imageUri = findSiteImage(trackedItemUI.currentPrice.uri);
        trackedItemUI.currentPrice.date = trackedItem.prices[0].dateEstablished;
        // calculate the duration of time this price has existed
        duration = moment.duration(trackedItem.prices[0].dateEstablished.valueOf() -
            (new Date()).valueOf()).humanize();
        if (duration === "a day") {
            duration = "1 day";
        }
        if (duration === "an hour") {
            duration = "1 hour";
        }
        trackedItemUI.currentPrice.duration = duration;

        // what about any past prices?
        trackedItemUI.pastPrices = [];
        if (trackedItem.prices.length > 1) {
            for (i = 1; i < trackedItem.prices.length; i++) {
                // there was a previous, previous price
                duration = moment.duration(trackedItem.prices[i].dateEstablished.valueOf() -
                    trackedItem.prices[i - 1].dateEstablished.valueOf()).humanize();
                if (duration === "a day") {
                    duration = "1 day";
                }
                if (duration === "an hour") {
                    duration = "1 hour";
                }
                trackedItemUI.pastPrices.push({
                    price: trackedItem.prices[i].price,
                    uri: trackedItem.prices[i].uri,
                    imageUri: findSiteImage(trackedItem.prices[i].uri),
                    date: trackedItem.prices[i].dateEstablished,
                    duration: duration
                });
            }
        }
    }

    return trackedItemUI;
}

function findSiteImage(uri) {
    var imageUri;

    if (uri.indexOf("amazon.com") > -1) {
        imageUri = "/public/img/amazon.png";
    } else if (uri.indexOf("play.google.com") > -1) {
        imageUri = "/public/img/google-play.png";
    } else if (uri.indexOf("bestbuy.com") > -1) {
        imageUri = "/public/img/best-buy.png";
    } else if (uri.indexOf("store.sonyentertainmentnetwork.com") > -1) {
        imageUri = "/public/img/sony-store.png";
    } else if (uri.indexOf("store.playstation.com") > -1) {
        imageUri = "/public/img/sony-store.png";
    } else if (uri.indexOf("gamestop.com") > -1) {
        imageUri = "/public/img/gamestop.png";
    } else if (uri.indexOf("crutchfield.com") > -1) {
        imageUri = "/public/img/crutchfield.png";
    } else if (uri.indexOf("ebags.com") > -1) {
        imageUri = "/public/img/ebags.png";
    }

    return imageUri;
}
