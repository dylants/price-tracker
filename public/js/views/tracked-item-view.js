/* global define:true */
define([
    "backbone",
    "underscore",
    "accounting",
    "text!../templates/tracked-item.html"
], function(Backbone, _, accounting, trackedItemHtml) {
    "use strict";

    return Backbone.View.extend({

        template: _.template(trackedItemHtml),

        events: {
            "click .tracked-item": "viewItemDetails"
        },

        initialize: function() {
            this.shouldBeDisplayed = false;
        },

        close: function() {
            // release all event listeners
            this.stopListening();
            this.$el.off("click");
        },

        render: function() {
            var model, currentPriceDate, yesterday;

            // because we're using accounting, and it's an unnamed module,
            // we must specifically pass it to the template on rendering so
            // it has it in scope.
            model = this.model.toJSON();
            model.accounting = accounting;

            this.$el.html(this.template(model));

            // if the item's current price was recently found, note that in the UI
            // (only do this if there are past prices)
            if (model.pastPrices[0]) {
                currentPriceDate = moment(model.currentPrice.date);
                yesterday = moment(new Date());
                yesterday.subtract("days", 1);
                if (currentPriceDate.isAfter(yesterday)) {
                    if (model.currentPrice.price < model.pastPrices[0].price) {
                        $(this.el).find(".tracked-item").addClass("recent-price-decrease");
                    } else {
                        $(this.el).find(".tracked-item").addClass("recent-price-increase");
                    }

                    // a price change means we should display this item
                    this.shouldBeDisplayed = true;
                }
            }

            return this;
        },

        viewItemDetails: function(ev) {
            ev.preventDefault();

            Backbone.history.navigate("tracked-item-details/" + this.model.id, {
                trigger: true
            });
        },

        shouldDisplay: function() {
            return this.shouldBeDisplayed;
        }
    });
});
