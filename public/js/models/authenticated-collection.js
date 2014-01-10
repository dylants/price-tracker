/* global define:true */
define([
    "backbone"
], function(Backbone) {
    "use strict";

    return Backbone.Collection.extend({
        sync: function(method, model, options) {
            wrapBackboneError(options);
            Backbone.Collection.prototype.sync.apply(this, arguments);
        }
    });
});

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
