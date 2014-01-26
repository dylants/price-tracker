/* global define:true */
define([
    "cached-authenticated-collection"
], function(CachedAuthenticatedCollection) {
    "use strict";

    return CachedAuthenticatedCollection.extend({
        url: "/api/tracked-items-ui"
    });
});
