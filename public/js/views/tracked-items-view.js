"use strict";

define([
    "jquery",
    "backbone",
    "underscore",
    "moment",
    "mobile-detect",
    "tracked-items-ui-model",
    "tracked-item-view",
    "text!../templates/tracked-items.html",
    "text!../templates/tracked-items-category.html",
    "text!../templates/tracked-items-subcategory.html"
], function($, Backbone, _, moment, MobileDetect, TrackedItemModel, TrackedItemView,
    trackedItemsHtml, trackedItemsCategoryHtml, trackedItemsSubcategoryHtml) {

    return Backbone.View.extend({

        el: "#main",

        template: _.template(trackedItemsHtml),
        templateCategory: _.template(trackedItemsCategoryHtml),
        templateSubcategory: _.template(trackedItemsSubcategoryHtml),

        events: {
            "click #display-all-button": "displayAll",
            "click #add-tracked-item-button": "addTrackedItem"
        },

        initialize: function() {
            var md = new MobileDetect(window.navigator.userAgent);
            this.isMobile = !!md.mobile();

            // render a subset of tracked items if we're on mobile
            if (this.isMobile) {
                this.collection.on("sync", this.renderTrackedItemsWithPriceChange, this);
            } else {
                this.collection.on("sync", this.renderAllTrackedItems, this);
            }
        },

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            this.$el.html(this.template());

            // fetch on the collection which will trigger the sync, and
            // render the tracked items
            this.collection.fetch();

            return this;
        },

        renderTrackedItemsWithPriceChange: function() {
            this.renderTrackedItems(true);
        },

        renderAllTrackedItems: function() {
            this.renderTrackedItems(false);
        },

        renderTrackedItems: function(onlyRenderWithPriceChange) {
            var trackedItemsSelector, trackedItemsUI, categories, that;

            trackedItemsSelector = $("#tracked-items");
            // clear the existing tracked items
            trackedItemsSelector.empty();

            trackedItemsUI = this.collection.toJSON();
            categories = _.keys(trackedItemsUI);

            that = this;
            this.collection.each(function(model) {
                var category, hasSubcategories, categoryHtml, categorySelector,
                    categorySubcategorySelector, trackedItemsPerCategory;

                model = model.toJSON();
                category = model.category;
                hasSubcategories = model.hasSubcategories;
                // remove the spaces for the category HTML
                categoryHtml = category.toLowerCase().replace(/\s*/g, "");
                // also remove all special characters
                categoryHtml = categoryHtml.replace(/[^\w\s]/gi, "");
                // render the category
                trackedItemsSelector.append(that.templateCategory({
                    category: category,
                    categoryHtml: categoryHtml
                }));
                categorySelector = $("#tracked-items-" + categoryHtml);
                categorySubcategorySelector = $("#tracked-items-subcategory-for-" +
                    categoryHtml);

                trackedItemsPerCategory = model.trackedItems;
                trackedItemsPerCategory.forEach(function(trackedItem) {
                    var currentPriceDate, yesterday;

                    currentPriceDate = moment(trackedItem.currentPrice.date);
                    yesterday = moment(new Date());
                    yesterday.subtract("days", 1);

                    if (onlyRenderWithPriceChange) {
                        // Only show those tracked items which have a
                        // change in price within the past 24 hours
                        if (currentPriceDate.isAfter(yesterday) && trackedItem.pastPrices[0]) {
                            // show this category
                            categorySelector.show();
                            // render the tracked item within that category
                            that.renderTrackedItem(trackedItem, hasSubcategories,
                                categorySubcategorySelector, categoryHtml);
                        }
                    } else {
                        // render it no matter the price change
                        // show this category
                        categorySelector.show();
                        // render the tracked item within that category
                        that.renderTrackedItem(trackedItem, hasSubcategories,
                            categorySubcategorySelector, categoryHtml);
                    }
                });
            });

            return this;
        },

        renderTrackedItem: function(trackedItem, hasSubcategories, categorySubcategorySelector, categoryHtml) {
            var trackedItemModel, trackedItemView, subcategory,
                subcategoryHtml, subcategorySelector;

            trackedItemModel = new TrackedItemModel(trackedItem);
            trackedItemView = new TrackedItemView({
                model: trackedItemModel
            });

            // if this category has subcategories, append this
            // tracked item to a subcategory. Otherwise, append
            // this tracked item (and all tracked items within
            // this category) to the category.
            if (hasSubcategories) {
                // get the subcategory from the tracked item. If it
                // doesn't have one, set it to "Other"
                subcategory = trackedItem.subcategory ? trackedItem.subcategory : "Other";

                // attempt to find the subcategory on the page to
                // see if it's already been added
                subcategoryHtml = subcategory.toLowerCase().replace(/\s*/g, "");
                subcategoryHtml = subcategoryHtml.replace(/[^\w\s]/gi, "");
                subcategorySelector = $("#tracked-items-" + categoryHtml +
                    "-" + subcategoryHtml);
                if (subcategorySelector.length > 0) {
                    // the subcategory has already been added, so just
                    // append the view
                    subcategorySelector.append(trackedItemView.render().el);
                } else {
                    // the subcategory has not yet been added, add it
                    categorySubcategorySelector.append(this.templateSubcategory({
                        subcategory: subcategory,
                        categoryHtml: categoryHtml,
                        subcategoryHtml: subcategoryHtml
                    }));

                    // since we've updated the page, refresh the selector
                    subcategorySelector = $(subcategorySelector.selector);
                    // and append the view to our subcategory
                    subcategorySelector.append(trackedItemView.render().el);
                }
            } else {
                categorySubcategorySelector.append(trackedItemView.render().el);
            }
        },

        addTrackedItem: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("add-tracked-item", {
                trigger: true
            });
        },

        displayAll: function(ev) {
            ev.preventDefault();

            // deselect the button
            ev.currentTarget.blur();

            this.renderAllTrackedItems();
        }
    });
});
