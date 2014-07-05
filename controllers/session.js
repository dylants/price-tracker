"use strict";

var passport = require("passport");

module.exports = function(app) {
    app.post("/session", function(req, res, next) {
        // calls passport's local strategy to authenticate
        passport.authenticate("local", function(err, user, info) {
            // if any problems exist, error out
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.send(500, info.message);
            }

            // log in the user
            req.logIn(user, function(err) {
                if (err) {
                    return next(err);
                }
                // once login succeeded, return the user and session created 201
                return res.send(201, user);
            });
        })(req, res, next);
    });

    app.delete("/session", function(req, res) {
        req.logout();
        res.send(200, {
            status: "OK"
        });
    });
};
