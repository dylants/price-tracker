/* global define:true */
define([
    "backbone",
    "tracked-item-model"
], function(Backbone, TrackedItemModel) {
    "use strict";

    return Backbone.Model.extend({
        url: "/api/tracked-items-ui",

        initialize: function() {
            this.fetch();
        }
    });
});
