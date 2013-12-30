/*global define:true */
define([
    "jquery",
    "backbone",
    "router",
    // our app requires moment
    "moment",
    // our app uses the loading dot dot dot jquery plugin
    "jquery.loadingdotdotdot"
], function($, Backbone, Router) {
    "use-strict";

    $(function() {
        new Router();

        Backbone.history.start({
            silent: false,
            root: "/price-tracker",
            pushState: true
        });
    });
});
