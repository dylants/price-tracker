module.exports = function(app) {
    app.get("/", function(req, res) {
        res.redirect("/price-tracker");
    });
    app.get("/price-tracker*", function(req, res) {
        if (app.get("env") == "production") {
            res.render("price-tracker-production.html");
        } else {
            res.render("price-tracker-development.html");
        }
    });
};
