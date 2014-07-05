"use strict";

define([
    "jquery",
    "backbone",
    "underscore",
    "text!../templates/add-tracked-item.html"
], function($, Backbone, _, addTrackedItemHtml) {

    return Backbone.View.extend({

        el: "#main",

        template: _.template(addTrackedItemHtml),

        events: {
            "click #populate": "populate",
            "click #add": "add",
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
            this.model.save({
                uri: uri
            }, {
                success: function(model, response, options) {
                    that.render();
                },
                error: function(model, response, options) {
                    console.error("unable to populate item details");
                    console.error("response: " + JSON.stringify(response));
                    that.render();
                }
            });

            this.renderWaiting(uri);
        },

        add: function(ev) {
            var uri, name, category, subcategory, price;

            ev.preventDefault();

            uri = $("input[id='uri']").val();
            name = $("input[id='name']").val();
            category = $("input[id='category']").val();
            subcategory = $("input[id='subcategory']").val();
            price = $("input[id='price']").val();

            this.model.save({
                uri: uri,
                name: name,
                category: category,
                subcategory: subcategory,
                price: price
            }, {
                success: function(model, response, options) {
                    Backbone.history.navigate("tracked-items", {
                        trigger: true
                    });
                }
            });

            Backbone.trigger("clear-cache");

            // TODO disable submit button to prevent double submit
        },

        cancel: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("tracked-items", {
                trigger: true
            });
        }
    });
});
