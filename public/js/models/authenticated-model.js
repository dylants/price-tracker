/* global define:true */
define([
    "backbone"
], function(Backbone) {
    "use strict";

    // Extend Backbone's Model to override the sync function. Doing so allows us
    // to get a hook into how the errors are handled. Here we can check if the
    // response code is unauthorized, and if so, navigate to the login page
    return Backbone.Model.extend({
        sync: function(method, model, options) {
            wrapBackboneError(options);
            Backbone.Model.prototype.sync.apply(this, arguments);
        }
    });
});

/**
 * Wrap Backbone's error with our own, which handles unauthenticated response codes
 * and performs the necessary logic in this case (navigate to login page, perhaps)
 *
 * @param  {Object} options The options for the sync function
 */
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
