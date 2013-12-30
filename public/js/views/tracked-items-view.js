/* global define:true */
define([
    "backbone",
    "underscore",
    "tracked-item-view",
    "text!../templates/tracked-items.html",
    "text!../templates/tracked-items-category.html"
], function(Backbone, _, TrackedItemView, trackedItemsHtml, trackedItemsCategoryHtml) {
    "use strict";

    return Backbone.View.extend({

        el: "#main",

        template: _.template(trackedItemsHtml),
        templateCategory: _.template(trackedItemsCategoryHtml),

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
        },

        addTrackedItem: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("add-tracked-item", {
                trigger: true
            });
        }
    });
});
