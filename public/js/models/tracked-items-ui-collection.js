"use strict";

define([
    "cached-authenticated-collection"
], function(CachedAuthenticatedCollection) {

    return CachedAuthenticatedCollection.extend({
        url: "/api/tracked-items-ui"
    });
});
