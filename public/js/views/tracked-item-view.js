/* global define:true */
define([
    "backbone",
    "underscore",
    "text!/assets/templates/tracked-item.html"
], function(Backbone, _, trackedItemHtml) {
    "use strict";

    return Backbone.View.extend({

        template: _.template(trackedItemHtml),

        events: {},

        initialize: function() {},

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            this.$el.html(this.template(this.model));
            return this;
        }
    });
});
