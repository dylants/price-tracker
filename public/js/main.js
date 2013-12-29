require.config({
    paths: {
        "underscore": "lib/underscore",
        "backbone": "lib/backbone",
        "jquery": "lib/jquery-2.0.3",
        "text": "lib/text",
        "moment": "lib/moment.min",
        "accounting": "lib/accounting.min",
        "tracked-item-model": "models/tracked-item-model",
        "tracked-items-model": "models/tracked-items-model",
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
        }
    }
});

require(["app"]);
