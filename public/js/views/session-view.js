"use strict";

define([
    "jquery",
    "backbone",
    "underscore",
    "text!../templates/session.html"
], function($, Backbone, _, sessionHtml) {

    return Backbone.View.extend({

        el: "#main",

        template: _.template(sessionHtml),

        events: {
            "click #login": "login"
        },

        initialize: function() {},

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));

            return this;
        },

        login: function(ev) {
            var username, password, that;

            ev.preventDefault();

            username = this.$("input[name='username']").val();
            password = this.$("input[name='password']").val();

            that = this;
            $.when(
                this.model.save({
                    username: username,
                    password: password
                })
            ).done(function() {
                Backbone.history.navigate("", {
                    trigger: true
                });
            }).fail(function() {
                that.render();
            });
        }
    });
});
