/* global define:true */
define([
    "backbone",
    "underscore",
    "accounting",
    "text!../templates/tracked-item.html"
], function(Backbone, _, accounting, trackedItemHtml) {
    "use strict";

    return Backbone.View.extend({

        template: _.template(trackedItemHtml),

        events: {
            "click .tracked-item": "viewItemDetails"
        },

        initialize: function() {},

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            var model;

            // because we're using accounting, and it's an unnamed module,
            // we must specifically pass it to the template on rendering so
            // it has it in scope.
            model = this.model.toJSON();
            model.accounting = accounting;

            this.$el.html(this.template(model));
            return this;
        },

        viewItemDetails: function(ev) {
            ev.preventDefault();

            console.log(this.model.id);
        },

        updateItemDetails: function(ev) {
            var name;

            ev.preventDefault();

            // TODO replace with updated name
            name = this.model.toJSON().name;

            this.model.save({
                name: name
            }, {
                patch: true
            });
        }
    });
});
