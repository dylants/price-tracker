/* global define:true */
define([
    "backbone"
], function(Backbone) {
    "use strict";

    return Backbone.Model.extend({
        urlRoot: "/api/tracked-items-ui"
    });
});
