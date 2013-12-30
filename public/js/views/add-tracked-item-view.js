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
            "click #cancel": "cancel"
        },

        initialize: function() {},

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            $(".waiting").Loadingdotdotdot("stop");
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        renderWaiting: function(uri) {
            this.$el.html(this.template({
                uri: uri,
                waiting: true
            }));
            $(".waiting").Loadingdotdotdot({
                "speed": 300,
                "maxDots": 4,
                "word": "Loading item details"
            });
        },

        populate: function(ev) {
            var uri, that;

            ev.preventDefault();

            uri = $("input[id='uri']").val();

            that = this;
            // use patch to just send the uri
            this.model.save({
                uri: uri
            }, {
                patch: true,
                success: function(model, resp, options) {
                    that.render();
                }
            });

            this.renderWaiting(uri);
        },

        cancel: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("tracked-items", {
                trigger: true
            });
        }
    });
});
