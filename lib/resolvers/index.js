/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var memory = require('./memory');
var system = require('./system');
var file = require('./file');

function registerResolvers(interpol) {
  memory.registerResolver(interpol);
  system.registerResolver(interpol);
  file.registerResolver(interpol);
}

// Exported Functions
exports.registerResolvers = registerResolvers;
