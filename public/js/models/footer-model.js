/* global define:true */
define([
    "cached-authenticated-model"
], function(CachedAuthenticatedModel) {
    "use strict";

    return CachedAuthenticatedModel.extend({
        urlRoot: "/api/status-ui"
    });
});
