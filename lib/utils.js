"use strict";

module.exports = {
    generateNum: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
};
