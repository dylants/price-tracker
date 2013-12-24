/* global define:true */
define([
    "backbone",
    "underscore",
    "tracked-item-view",
    "text!/assets/templates/tracked-items.html"
], function(Backbone, _, TrackedItemView, trackedItemsHtml) {
    "use strict";

    return Backbone.View.extend({

        el: "#main",

        template: _.template(trackedItemsHtml),

        events: {},

        initialize: function() {
            this.collection.on( "sync", this.renderTrackedItems, this );
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
            var trackedItemsSelector;

            trackedItemsSelector = $("#tracked-items");
            // clear the existing tracked items
            trackedItemsSelector.empty();

            this.collection.each(function(trackedItem) {
                var trackedItemView;

                trackedItemView = new TrackedItemView({
                    model: trackedItem
                });
                trackedItemsSelector.append(trackedItemView.render().el);
            });

            return this;
        }
    });
});
