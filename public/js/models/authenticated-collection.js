"use strict";

define([
    "backbone"
], function(Backbone) {

    var wrapBackboneError = function(options) {
        var error = options.error;
        options.error = function(response) {
            if (response.status === 401) {
                Backbone.history.navigate("login", {
                    trigger: true
                });
            } else {
                if (error) error(response);
            }
        };
    };

    return Backbone.Collection.extend({
        sync: function(method, model, options) {
            wrapBackboneError(options);
            Backbone.Collection.prototype.sync.apply(this, arguments);
        }
    });
});
