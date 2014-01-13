/* global define:true */
define([
    "authenticated-model"
], function(AuthenticatedModel) {
    "use strict";

    return AuthenticatedModel.extend({
        urlRoot: "/api/status-ui"
    });
});