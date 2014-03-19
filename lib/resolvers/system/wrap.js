/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util');

var slice = Array.prototype.slice
  , bless = util.bless
  , configure = util.configure;

function wrap(func) {
  return bless(wrappedFunction);

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice.call(arguments, 1));
  }
}

function configurable(func) {
  blessedConfigure.__interpolFunction = true;
  func.configure = blessedConfigure;
  return func;

  function blessedConfigure(writer) {
    // writer, value are always passed to configurables, hence the '2'
    var configured = configure(func, 2, slice.call(arguments, 1));
    configured.__interpolFunction = true;
    return configured;
  }
}

// Exports
exports.wrap = wrap;
exports.configurable = configurable;
