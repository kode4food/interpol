/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../types');
var bless = types.bless;

function createModuleStub(moduleExports) {
  moduleExports = blessModule(moduleExports);
  templateInterface.__intModule = true;
  templateInterface.exports = templateExports;
  return templateInterface;

  function templateInterface() {
    // NO-OP
  }

  function templateExports() {
    return moduleExports;
  }
}

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

// Exported Functions
exports.createModuleStub = createModuleStub;
exports.blessModule = blessModule;
