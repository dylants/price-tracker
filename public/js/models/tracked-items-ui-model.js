"use strict";

define([
    "authenticated-model"
], function(AuthenticatedModel) {

    return AuthenticatedModel.extend({
        urlRoot: "/api/tracked-items-ui"
    });
});
