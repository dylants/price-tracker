require("express-namespace");
var express = require("express"),
    fs = require("fs"),
    cons = require("consolidate"),
    app = express(),
    passport = require("passport"),
    mongoose = require("mongoose"),
    http = require("http"),
    https = require("https");

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

// configure the app (all environments)
app.configure(function() {
    // read the port from the environment, else set to 3000
    app.set("port", process.env.PORT || 3000);
    app.set("httpsPort", process.env.HTTPS_PORT || 3400);

    // redirect all HTTP requests to HTTPS
    app.use(function(req, res, next) {
        var hostname;
        if (!req.secure) {
            hostname = req.get("host").split(":")[0];
            return res.redirect(["https://", hostname, ":", app.get("httpsPort"), req.url].join(""));
        }
        next();
    });

    // configure view rendering (underscore)
    app.engine("html", cons.underscore);
    app.set("view engine", "html");
    app.set("views", __dirname + "/views");

    // use express' cookie parser to access request cookies
    app.use(express.cookieParser());

    // use express' body parser to access body elements later
    app.use(express.bodyParser());

    // use express' cookie session
    app.use(express.cookieSession({
        key: "ptsc",
        secret: "ptss",
        cookie: {
            maxAge: SESSION_COOKIE_LIFETIME
        }
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

    // lock the router to process routes up to this point
    app.use(app.router);

    // static assets processed after routes, mapped to /public
    app.use("/public", express.static(__dirname + "/public"));

    // load cron jobs
    require("./cron-jobs");
});

// configuration for development environment
app.configure("development", function() {
    console.log("in development environment");
    app.use(express.errorHandler());
});

// configuration for production environment (NODE_ENV=production)
app.configure("production", function() {
    console.log("in production environment");
    // configure a generic 500 error message
    app.use(function(err, req, res, next) {
        res.send(500, "An error has occurred");
    });
});

// HTTPS configuration
var httpsOptions = {
    key: fs.readFileSync("certs/server.key"),
    cert: fs.readFileSync("certs/server.crt")
};

// start the app on HTTP
app.listen(app.get("port"), function() {
    console.log("Express server listening on HTTP on port " + app.get("port"));
});

// start the app on HTTPS
https.createServer(httpsOptions, app).listen(app.get("httpsPort"), function() {
    console.log("Express server listening on HTTPS on port " + app.get("httpsPort"));
});
