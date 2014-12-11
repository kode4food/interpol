/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');
var types = require('../types');
var slice = util.slice;
var bless = types.bless;

/**
 * Creates a 'blessed' module where are Functions are made to be both
 * Interpol-compatible and configurable.
 *
 * @param {Object} module the Module to bless
 */
function blessModule(module) {
  var result = {};
  for ( var key in module ) {
    var value = module[key];
    if ( typeof value === 'function') {
      result[key] = bless(value);
    }
    else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Takes a hash of Functions, blesses them, and creates a stub module for
 * them that can be returned by the `resolveModule()` call.
 *
 * @param {Object} moduleExports the hash of Functions to stub
 */
function createModuleStub(moduleExports) {
  moduleExports = blessModule(moduleExports);
  templateInterface.__intModule = true;
  templateInterface.exports = templateExports;
  return templateInterface;

  function templateInterface() {
    return '';
  }

  function templateExports() {
    return moduleExports;
  }
}

/**
 * Wraps a Function in an envelope that accepts a Writer (but discards it).
 *
 * @param {Function} func the Function to wrap
 */
function wrap(func) {
  return bless(wrappedFunction);

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice(arguments, 1));
  }
}

// Exported Functions
exports.blessModule = blessModule;
exports.createModuleStub = createModuleStub;
exports.wrap = wrap;
