/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../../types');
var bless = types.bless;

var slice = Array.prototype.slice;

/**
 * Wraps a Function in an envelope that accepts a Writer (but discards it).
 *
 * @param {Function} func the Function to wrap
 */
function wrap(func) {
  return bless(wrappedFunction);

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice.call(arguments, 1));
  }
}

// Exported Functions
exports.wrap = wrap;
