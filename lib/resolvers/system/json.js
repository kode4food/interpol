/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var wrapFunction = require('./wrap');

// Exports
exports.parse = wrapFunction(JSON.parse);
exports.stringify = wrapFunction(JSON.stringify);
