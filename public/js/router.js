"use strict";

define([
    "backbone",
    "jquery",
    "session-model",
    "session-view",
    "tracked-items-ui-collection",
    "tracked-items-ui-model",
    "tracked-items-view",
    "add-tracked-item-view",
    "tracked-item-details-view",
    "footer-model",
    "footer-view"
], function(Backbone, $, SessionModel, SessionView, TrackedItemsUICollection,
    TrackedItemsUIModel, TrackedItemsView, AddTrackedItemView, TrackedItemDetailsView,
    FooterModel, FooterView) {

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
            this.currentView = null;
            this.trackedItemsUICollection = null;
            this.footerModel = null;
            this.footerView = null;
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
            if (!this.trackedItemsUICollection) {
                this.trackedItemsUICollection = new TrackedItemsUICollection();
            }

            if (this.currentView) {
                this.currentView.close();
            }

            this.currentView = new TrackedItemsView({
                collection: this.trackedItemsUICollection
            });
            this.currentView.render();

            // also render the footer
            this.renderFooter();
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

        renderFooter: function() {
            if (!this.footerModel) {
                this.footerModel = new FooterModel();
            }

            if (this.footerView) {
                this.footerView.close();
            }

            this.footerView = new FooterView({
                model: this.footerModel
            });
            this.footerView.render();
        },

        badRoute: function(invalidRoute) {
            console.error("bad route: " + invalidRoute);
            console.error("redirecting to /");
            location.href = "/";
        }
    });

    return Router;

});
