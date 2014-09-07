/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var math = require('./math');
var list = require('./list');
var string = require('./string');

function registerResolver(interpol) {
  var defaultMemoryResolver = interpol.defaultMemoryResolver;
  defaultMemoryResolver.registerModule('math', math);
  defaultMemoryResolver.registerModule('list', list);
  defaultMemoryResolver.registerModule('string', string);
}

// Exported Functions
exports.registerResolver = registerResolver;
