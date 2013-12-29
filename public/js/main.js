require.config({
    paths: {
        "underscore": "/assets/js/lib/underscore",
        "backbone": "/assets/js/lib/backbone",
        "jquery": "/assets/js/lib/jquery-2.0.3",
        "text": "/assets/js/lib/text",
        "moment": "/assets/js/lib/moment.min",
        "tracked-item-model": "/assets/js/models/tracked-item-model",
        "tracked-items-model": "/assets/js/models/tracked-items-model",
        "tracked-item-view": "/assets/js/views/tracked-item-view",
        "tracked-items-view": "/assets/js/views/tracked-items-view",
        "router": "/assets/js/router",
        "app": "/assets/js/app"
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
