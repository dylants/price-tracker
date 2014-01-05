/* global define:true */
define([
    "backbone",
    "underscore",
    "accounting",
    "text!../templates/tracked-item-details-outline.html",
    "text!../templates/tracked-item-details.html"
], function(Backbone, _, accounting, trackedItemDetailsOutlineHtml,
    trackedItemDetailsHtml) {
    "use strict";

    return Backbone.View.extend({

        el: "#main",

        templateOutline: _.template(trackedItemDetailsOutlineHtml),
        templateDetails: _.template(trackedItemDetailsHtml),

        events: {
            "click #update": "updateTrackedItem",
            "click #delete": "deleteTrackedItem",
            "click #cancel": "cancel"
        },

        initialize: function() {
            this.model.on( "sync", this.renderItemDetails, this );
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

        updateTrackedItem: function(ev) {
            var uri, name, category, subcategory;

            ev.preventDefault();

            uri = $("input[id='uri']").val();
            name = $("input[id='name']").val();
            category = $("input[id='category']").val();
            subcategory = $("input[id='subcategory']").val();

            this.model.save({
                uri: uri,
                name: name,
                category: category,
                subcategory: subcategory
            }, {
                patch: true,
                success: function(model, response, options) {
                    Backbone.history.navigate("tracked-items", {
                        trigger: true
                    });
                }
            });
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
        },
        
        cancel: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("tracked-items", {
                trigger: true
            });
        }
    });
});
