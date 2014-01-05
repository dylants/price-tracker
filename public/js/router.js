/*global define:true */
define([
    "backbone",
    "jquery",
    "tracked-items-ui-model",
    "tracked-items-view",
    "add-tracked-item-view",
    "tracked-item-details-view"
], function(Backbone, $, TrackedItemsUIModel, TrackedItemsView, AddTrackedItemView,
    TrackedItemDetailsView) {
    "use strict";

    var trackedItemsUIModel, trackedItemsView, addTrackedItemView, trackedItemDetailsView;

    var Router = Backbone.Router.extend({
        routes: {
            "": "defaultRoute",
            "tracked-items": "trackedItems",
            "add-tracked-item": "addTrackedItem",
            "tracked-item-details/:id": "trackedItemDetails",
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

        trackedItemDetails: function(id) {
            if (trackedItemDetailsView) {
                trackedItemDetailsView.close();
            }

            trackedItemsUIModel = new TrackedItemsUIModel({
                id: id
            });
            trackedItemDetailsView = new TrackedItemDetailsView({
                model: trackedItemsUIModel
            });
            trackedItemDetailsView.render();
        },

        badRoute: function(invalidRoute) {
            console.error("bad route: " + invalidRoute);
            console.error("redirecting to /");
            location.href = "/";
        }
    });

    return Router;

});
