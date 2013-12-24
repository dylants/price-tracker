/*global define:true */
define([
    "backbone",
    "jquery",
    "tracked-items-collection",
    "tracked-items-view"
], function(Backbone, $, TrackedItemsCollection, TrackedItemsView) {
    "use strict";

    var trackedItemsCollection, trackedItemsView;

    var Router = Backbone.Router.extend({
        routes: {
            "": "defaultRoute",
            "tracked-items": "trackedItems",
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

            trackedItemsCollection = new TrackedItemsCollection();
            trackedItemsView = new TrackedItemsView({
                collection: trackedItemsCollection
            });
            trackedItemsView.render();
        },

        badRoute: function(invalidRoute) {
            console.error("bad route: " + invalidRoute);
            console.error("redirecting to /");
            location.href = "/";
        }
    });

    return Router;

});
