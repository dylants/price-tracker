/* global define:true */
define([
    "backbone",
    "tracked-item-model"
], function(Backbone, TrackedItemModel) {
    "use strict";

    return Backbone.Collection.extend({
        url: "/api/tracked-items",

        model: TrackedItemModel,

        initialize: function() {
            this.fetch();
        }
    });
});
