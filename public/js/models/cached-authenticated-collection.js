"use strict";

define([
    "authenticated-collection",
    "backbone"
], function(AuthenticatedCollection, Backbone) {

    return AuthenticatedCollection.extend({
        fetch: function(options) {
            if (this.models.length > 0) {
                // don't perform a fetch, but trigger the sync as if
                // one occurred (but it will use the cached data)
                this.trigger("sync", this, null, options);
            } else {
                // no cache exists, perform a fetch
                Backbone.Collection.prototype.fetch.apply(this, arguments);
            }
        }
    });
});
