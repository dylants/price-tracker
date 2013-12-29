/* global define:true */
define([
    "backbone",
    "underscore",
    "text!../templates/add-tracked-item.html"
], function(Backbone, _, addTrackedItemHtml) {
    "use strict";

    return Backbone.View.extend({

        el: "#main",

        template: _.template(addTrackedItemHtml),

        events: {
            "click #populate": "populate",
            "click .cancel": "cancel"
        },

        initialize: function() {},

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            this.$el.html(this.template());
            return this;
        },

        populate: function(ev) {
            ev.preventDefault();

            console.log("populate!");
        },

        cancel: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("tracked-items", {
                trigger: true
            });
        }
    });
});
