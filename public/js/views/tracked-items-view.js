/* global define:true */
define([
    "backbone",
    "underscore",
    "tracked-items-ui-model",
    "tracked-item-view",
    "text!../templates/tracked-items.html",
    "text!../templates/tracked-items-category.html",
    "text!../templates/tracked-items-subcategory.html"
], function(Backbone, _, TrackedItemModel, TrackedItemView, trackedItemsHtml,
    trackedItemsCategoryHtml, trackedItemsSubcategoryHtml) {
    "use strict";

    return Backbone.View.extend({

        el: "#main",

        template: _.template(trackedItemsHtml),
        templateCategory: _.template(trackedItemsCategoryHtml),
        templateSubcategory: _.template(trackedItemsSubcategoryHtml),

        events: {
            "click #add-tracked-item-button": "addTrackedItem"
        },

        initialize: function() {
            this.model.on( "sync", this.renderTrackedItems, this );
        },

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            this.$el.html(this.template());

            // fetch on the model which will trigger the sync, and
            // call the renderTrackedItems function
            this.model.fetch();

            return this;
        },

        renderTrackedItems: function() {
            var trackedItemsSelector, trackedItemsUI, categories, that;

            trackedItemsSelector = $("#tracked-items");
            // clear the existing tracked items
            trackedItemsSelector.empty();

            trackedItemsUI = this.model.toJSON();
            categories = _.keys(trackedItemsUI);

            that = this;
            categories.forEach(function(category) {
                var hasSubcategories, categoryHtml, categorySelector,
                    trackedItemsPerCategory;

                hasSubcategories = trackedItemsUI[category].hasSubcategories;
                categoryHtml = category.toLowerCase().replace(/\s*/g, "");
                // render the category
                trackedItemsSelector.append(that.templateCategory({
                    category: category,
                    categoryHtml: categoryHtml
                }));
                categorySelector = $("#tracked-items-" + categoryHtml);

                trackedItemsPerCategory = trackedItemsUI[category].trackedItems;
                trackedItemsPerCategory.forEach(function(trackedItem) {
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
                        subcategorySelector = $("#tracked-items-" + categoryHtml +
                            "-" + subcategoryHtml);
                        if (subcategorySelector.length > 0) {
                            // the subcategory has already been added, so just
                            // append the view
                            subcategorySelector.append(trackedItemView.render().el);
                        } else {
                            // the subcategory has not yet been added, add it
                            categorySelector.append(that.templateSubcategory({
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
                        categorySelector.append(trackedItemView.render().el);
                    }
                });
            });

            return this;
        },

        addTrackedItem: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("add-tracked-item", {
                trigger: true
            });
        }
    });
});
