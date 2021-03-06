"use strict";

require.config({
    paths: {
        "underscore": "lib/underscore",
        "backbone": "lib/backbone",
        "jquery": "lib/jquery-2.0.3",
        "jquery.loadingdotdotdot": "lib/jquery.loadingdotdotdot",
        "text": "lib/text",
        "moment": "lib/moment.min",
        "accounting": "lib/accounting.min",
        "mobile-detect": "lib/mobile-detect.min",
        "authenticated-collection": "models/authenticated-collection",
        "authenticated-model": "models/authenticated-model",
        "cached-authenticated-collection": "models/cached-authenticated-collection",
        "cached-authenticated-model": "models/cached-authenticated-model",
        "footer-model": "models/footer-model",
        "session-model": "models/session-model",
        "tracked-items-ui-collection": "models/tracked-items-ui-collection",
        "tracked-items-ui-model": "models/tracked-items-ui-model",
        "add-tracked-item-view": "views/add-tracked-item-view",
        "footer-view": "views/footer-view",
        "session-view": "views/session-view",
        "tracked-item-details-view": "views/tracked-item-details-view",
        "tracked-item-view": "views/tracked-item-view",
        "tracked-items-view": "views/tracked-items-view",
        "router": "router",
        "app": "app"
    },
    shim: {
        "underscore": {
            exports: "_"
        },
        "backbone": {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        },
        "jquery.loadingdotdotdot": {
            deps: ["jquery"]
        },
        "mobile-detect": {
            exports: "MobileDetect"
        }
    }
});

require(["app"]);
