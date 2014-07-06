"use strict";

require("express-namespace");
var express = require("express"),
    bodyParser = require("body-parser"),
    session = require("cookie-session"),
    errorhandler = require("errorhandler"),
    fs = require("fs"),
    cons = require("consolidate"),
    app = express(),
    passport = require("passport"),
    mongoose = require("mongoose");

// 365 days for session cookie lifetime
var SESSION_COOKIE_LIFETIME = 1000 * 60 * 60 * 24 * 365;

// Verifies the user is authenticated, else returns unauthorized
var requireAuthentication = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    // send the error as JSON to be nice to clients
    res.send(401, {
        error: "Unauthorized"
    });
};

// read the port from the environment, else set to 3000
app.set("port", process.env.PORT || 3000);

// configure view rendering (underscore)
app.engine("html", cons.underscore);
app.set("view engine", "html");
app.set("views", __dirname + "/views");

// use express' body parser to access body elements later
app.use(bodyParser.json());

// use express' session
app.use(session({
    name: "ptsc",
    secret: "ptss",
    maxage: SESSION_COOKIE_LIFETIME
}));

/*
 * Connect to mongoDB at localhost using the database "price-tracker".
 * This connection will be used by the mongoose API throughout
 * our code base.
 */
mongoose.connect("mongodb://localhost/price-tracker", function(error) {
    // handle the error case
    if (error) {
        console.error("Failed to connect to the Mongo server!!");
        console.error(error);
        throw error;
    }
});

// bring in all models into scope (these use mongoose)
fs.readdirSync("models").forEach(function(modelName) {
    require("./models/" + modelName);
});

// include passport authentication (after mongo since it requires it)
require("./passport-configuration");
app.use(passport.initialize());
app.use(passport.session());

// configure that all routes under /api require authentication
app.all("/api/*", requireAuthentication);

// pull in all the controllers (these contain routes)
fs.readdirSync("controllers").forEach(function(controllerName) {
    require("./controllers/" + controllerName)(app);
});

// static assets processed after routes, mapped to /public
app.use("/public", express.static(__dirname + "/public"));

// load cron jobs
require("./cron-jobs");

// configuration for development environment
if (app.get("env") === "development") {
    console.log("in development environment");
    app.use(errorhandler());
}

// configuration for production environment (NODE_ENV=production)
if (app.get("env") === "production") {
    console.log("in production environment");
    // configure a generic 500 error message
    app.use(function(err, req, res, next) {
        res.send(500, "An error has occurred");
    });
}

// start the app on HTTP
app.listen(app.get("port"), function() {
    console.log("Express server listening on HTTP on port " + app.get("port"));
});
