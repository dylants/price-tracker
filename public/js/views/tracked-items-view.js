/* global define:true */
define([
    "backbone",
    "underscore",
    "tracked-item-view",
    "text!/assets/templates/tracked-items.html",
    "text!/assets/templates/tracked-items-category.html"
], function(Backbone, _, TrackedItemView, trackedItemsHtml, trackedItemsCategoryHtml) {
    "use strict";

    return Backbone.View.extend({

        el: "#main",

        template: _.template(trackedItemsHtml),
        templateCategory: _.template(trackedItemsCategoryHtml),

        events: {},

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
            return this;
        },

        renderTrackedItems: function() {
            var trackedItemsSelector, trackedItems, categories, count, that;

            trackedItemsSelector = $("#tracked-items");
            // clear the existing tracked items
            trackedItemsSelector.empty();

            trackedItems = this.model.toJSON();
            categories = _.keys(trackedItems);

            count = 0;
            that = this;
            categories.forEach(function(category) {
                var categoryHtml, categorySelector, trackedItemsPerCategory;

                categoryHtml = "category" + count;
                count++;
                // render the category
                trackedItemsSelector.append(that.templateCategory({
                    category: category,
                    categoryHtml: categoryHtml
                }));
                categorySelector = $("#tracked-items-" + categoryHtml);

                trackedItemsPerCategory = trackedItems[category];
                trackedItemsPerCategory.forEach(function(trackedItem) {
                    var trackedItemView;

                    trackedItemView = new TrackedItemView({
                        model: trackedItem
                    });
                    categorySelector.append(trackedItemView.render().el);
                });
            });

            return this;
        }
    });
});