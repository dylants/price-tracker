"use strict";

define([
    "underscore",
    "authenticated-model",
    "backbone"
], function(_, AuthenticatedModel, Backbone) {

    return AuthenticatedModel.extend({

        initialize: function() {
            Backbone.on("clear-cache", this.clearCache, this);
        },

        clearCache: function() {
            this._reset();
        },

        fetch: function(options) {
            if (_.keys(this.attributes).length > 0) {
                // don't perform a fetch, but trigger the sync as if
                // one occurred (but it will use the cached data)
                this.trigger("sync", this, null, options);
            } else {
                // no cache exists, perform a fetch
                Backbone.Model.prototype.fetch.apply(this, arguments);
            }
        }
    });
});
