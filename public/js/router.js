/*global define:true */
define([
    "backbone",
    "jquery",
    "tracked-items-ui-model",
    "tracked-items-view",
    "add-tracked-item-view"
], function(Backbone, $, TrackedItemsUIModel, TrackedItemsView, AddTrackedItemView) {
    "use strict";

    var trackedItemsUIModel, trackedItemsView, addTrackedItemView;

    var Router = Backbone.Router.extend({
        routes: {
            "": "defaultRoute",
            "tracked-items": "trackedItems",
            "add-tracked-item": "addTrackedItem",
            "*invalidRoute": "badRoute"
        },

        initialize: function() {
            this.on("route", this.routeCalled, this);
        },

        routeCalled: function(routeCalled, args) {
            // scroll to the top of the window on every route call
            window.scrollTo(0, 0);
        },

        defaultRoute: function() {
            Backbone.history.navigate("tracked-items", {
                trigger: true
            });
        },

        trackedItems: function() {
            if (trackedItemsView) {
                trackedItemsView.close();
            }

            trackedItemsUIModel = new TrackedItemsUIModel();
            trackedItemsView = new TrackedItemsView({
                model: trackedItemsUIModel
            });
            trackedItemsView.render();
        },

        addTrackedItem: function() {
            if (addTrackedItemView) {
                addTrackedItemView.close();
            }

            trackedItemsUIModel = new TrackedItemsUIModel();
            addTrackedItemView = new AddTrackedItemView({
                model: trackedItemsUIModel
            });
            addTrackedItemView.render();
        },

        badRoute: function(invalidRoute) {
            console.error("bad route: " + invalidRoute);
            console.error("redirecting to /");
            location.href = "/";
        }
    });

    return Router;

});
