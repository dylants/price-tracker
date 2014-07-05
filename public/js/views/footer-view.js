"use strict";

define([
    "backbone",
    "underscore",
    "text!../templates/footer.html"
], function(Backbone, _, footerHtml) {

    return Backbone.View.extend({

        el: "footer",

        template: _.template(footerHtml),

        events: {},

        initialize: function() {
            this.model.on("sync", this.renderStatus, this);
        },

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            // render nothing, just fetch the model
            this.model.fetch();

            return this;
        },

        renderStatus: function() {
            this.$el.html(this.template(this.model.toJSON()));

            return this;
        }
    });
});
