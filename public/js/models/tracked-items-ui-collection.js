/* global define:true */
define([
    "authenticated-collection"
], function(AuthenticatedCollection) {
    "use strict";

    return AuthenticatedCollection.extend({
        url: "/api/tracked-items-ui"
    });
});
