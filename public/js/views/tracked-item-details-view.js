"use strict";

define([
    "jquery",
    "backbone",
    "underscore",
    "accounting",
    "text!../templates/tracked-item-details-outline.html",
    "text!../templates/tracked-item-details.html"
], function($, Backbone, _, accounting, trackedItemDetailsOutlineHtml,
    trackedItemDetailsHtml) {

    return Backbone.View.extend({

        el: "#main",

        templateOutline: _.template(trackedItemDetailsOutlineHtml),
        templateDetails: _.template(trackedItemDetailsHtml),

        events: {
            "click table": "redirectToPriceSite",
            "click #edit": "displayEditableDetails",
            "click #back": "cancel",
            "click #update": "updateTrackedItem",
            "click #delete": "deleteTrackedItem",
            "click #cancel": "cancel"
        },

        initialize: function() {
            this.model.on("sync", this.renderItemDetails, this);
        },

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            this.$el.html(this.templateOutline());

            // fetch will trigger sync, which will render the item details
            this.model.fetch();

            return this;
        },

        renderItemDetails: function() {
            var model, trackedItemDetailsSelector;

            // because we're using accounting, and it's an unnamed module,
            // we must specifically pass it to the template on rendering so
            // it has it in scope.
            model = this.model.toJSON();
            model.accounting = accounting;

            // render the item details
            trackedItemDetailsSelector = $("#tracked-item-details");
            trackedItemDetailsSelector.empty();
            trackedItemDetailsSelector.append(this.templateDetails(model));

            return this;
        },

        redirectToPriceSite: function(ev) {
            ev.preventDefault();

            location.href = this.model.toJSON().currentPrice.uri;
        },

        displayEditableDetails: function(ev) {
            ev.preventDefault();

            $("#editable-details-buttons").hide();
            $("#editable-details").show();
        },

        updateTrackedItem: function(ev) {
            var name, category, subcategory, uri1, uri2;

            ev.preventDefault();

            name = $("input[id='name']").val();
            category = $("input[id='category']").val();
            subcategory = $("input[id='subcategory']").val();
            uri1 = $("input[id='uri1']").val();
            uri2 = $("input[id='uri2']").val();

            this.model.save({
                name: name,
                category: category,
                subcategory: subcategory,
                uri1: uri1,
                uri2: uri2
            }, {
                patch: true,
                success: function(model, response, options) {
                    Backbone.history.navigate("tracked-items", {
                        trigger: true
                    });
                }
            });

            Backbone.trigger("clear-cache");
        },

        deleteTrackedItem: function(ev) {
            ev.preventDefault();

            this.model.destroy({
                success: function(model, response, options) {
                    Backbone.history.navigate("tracked-items", {
                        trigger: true
                    });
                }
            });

            Backbone.trigger("clear-cache");
        },

        cancel: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("tracked-items", {
                trigger: true
            });
        }
    });
});
