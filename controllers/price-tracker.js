module.exports = function(app) {
    app.get("/", function(req, res) {
        res.redirect("/price-tracker");
    });
    app.get("/price-tracker*", function(req, res) {
        res.render("price-tracker");
    });
};
