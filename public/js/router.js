/*global define:true */
define([
    "backbone",
    "jquery",
    "session-model",
    "session-view",
    "tracked-items-ui-collection",
    "tracked-items-ui-model",
    "tracked-items-view",
    "add-tracked-item-view",
    "tracked-item-details-view"
], function(Backbone, $, SessionModel, SessionView, TrackedItemsUICollection,
    TrackedItemsUIModel, TrackedItemsView, AddTrackedItemView, TrackedItemDetailsView) {
    "use strict";


    var Router = Backbone.Router.extend({
        routes: {
            "": "defaultRoute",
            "login": "login",
            "tracked-items": "trackedItems",
            "add-tracked-item": "addTrackedItem",
            "tracked-item-details/:id": "trackedItemDetails",
            "*invalidRoute": "badRoute"
        },

        initialize: function() {
            this.on("route", this.routeCalled, this);

            this.currentView = null;
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

        login: function() {
            var sessionModel;

            if (this.currentView) {
                this.currentView.close();
            }

            sessionModel = new SessionModel();
            this.currentView = new SessionView({
                model: sessionModel
            });
            this.currentView.render();
        },

        trackedItems: function() {
            var trackedItemsUICollection;

            if (this.currentView) {
                this.currentView.close();
            }

            trackedItemsUICollection = new TrackedItemsUICollection();
            this.currentView = new TrackedItemsView({
                collection: trackedItemsUICollection
            });
            this.currentView.render();
        },

        addTrackedItem: function() {
            var trackedItemsUIModel;

            if (this.currentView) {
                this.currentView.close();
            }

            trackedItemsUIModel = new TrackedItemsUIModel();
            this.currentView = new AddTrackedItemView({
                model: trackedItemsUIModel
            });
            this.currentView.render();
        },

        trackedItemDetails: function(id) {
            var trackedItemsUIModel;

            if (this.currentView) {
                this.currentView.close();
            }

            trackedItemsUIModel = new TrackedItemsUIModel({
                id: id
            });
            this.currentView = new TrackedItemDetailsView({
                model: trackedItemsUIModel
            });
            this.currentView.render();
        },

        badRoute: function(invalidRoute) {
            console.error("bad route: " + invalidRoute);
            console.error("redirecting to /");
            location.href = "/";
        }
    });

    return Router;

});
