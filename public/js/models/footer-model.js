"use strict";

define([
    "cached-authenticated-model"
], function(CachedAuthenticatedModel) {

    return CachedAuthenticatedModel.extend({
        urlRoot: "/api/status-ui"
    });
});
