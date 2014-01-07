require("express-namespace");
var express = require("express"),
    fs = require("fs"),
    cons = require("consolidate"),
    app = express(),
    mongoose = require("mongoose");

var mongoUrl;

// configuration for development environment
app.configure("development", function() {
    console.log("in development environment");

    // read the port from the environment, else set to 3000
    app.set("port", process.env.PORT || 3000);

    // set the mongo URL to localhost, price-tracker database
    mongoUrl = "mongodb://localhost/price-tracker";

    // configure express' error handler for development
    app.use(express.errorHandler());
});

// configuration for production environment (NODE_ENV=production)
app.configure("production", function() {
    var vcapServices, mongoConfiguration;

    console.log("in production environment");

    // read the port from VCAP, else set to 3000
    app.set("port", process.env.VCAP_APP_PORT || 3000);

    // load the mongo configuration from VCAP
    vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    mongoConfiguration = vcapServices["mongodb-1.8"][0]["credentials"];

    mongoUrl = "mongodb://";
    if (mongoConfiguration.username && mongoConfiguration.password) {
        mongoUrl = mongoUrl + mongoConfiguration.username + ":" +
            mongoConfiguration.password + "@";
    }
    mongoUrl = mongoUrl + mongoConfiguration.hostname + ":" + 
        mongoConfiguration.port + "/" + mongoConfiguration.db;

    // configure a generic 500 error message
    app.use(function(err, req, res, next) {
        res.send(500, "An error has occurred");
    });
});

// configure the app (all environments)
app.configure(function() {
    // configure view rendering (underscore)
    app.engine("html", cons.underscore);
    app.set("view engine", "html");
    app.set("views", __dirname + "/views");

    // use express' cookie parser to access request cookies
    app.use(express.cookieParser());

    // use express' body parser to access body elements later
    app.use(express.bodyParser());

    /*
     * Connect to mongoDB at localhost using the database "price-tracker".
     * This connection will be used by the mongoose API throughout
     * our code base.
     */
    mongoose.connect(mongoUrl, function(error) {
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

    // pull in all the controllers (these contain routes)
    fs.readdirSync("controllers").forEach(function(controllerName) {
        require("./controllers/" + controllerName)(app);
    });

    // lock the router to process routes up to this point
    app.use(app.router);

    // static assets processed after routes, mapped to /public
    app.use("/public", express.static(__dirname + "/public"));
});

// start the app
app.listen(app.get("port"), function() {
    console.log("Express server listening on port " + app.get("port"));
});
