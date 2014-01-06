/* global define:true */
define([
    "backbone"
], function(Backbone) {
    "use strict";

    return Backbone.Collection.extend({
        url: "/api/tracked-items-ui"
    });
});
