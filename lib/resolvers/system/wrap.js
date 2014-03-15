/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var slice = Array.prototype.slice;

function wrapFunction(func) {
  wrappedFunction.__interpolPartial = true;
  return wrappedFunction;

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice.call(arguments, 1));
  }
}

// Exports
module.exports = wrapFunction;
