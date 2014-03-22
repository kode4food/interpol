/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../../interpol')
  , util = require('../../util')
  , wrap = require('./wrap');

var freezeObject = util.freezeObject
  , bless = util.bless
  , configurable = wrap.configurable;

// Implementation ***********************************************************

function createSystemResolver() {
  var modules = buildModules();

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports
  };

  function resolveModule(name) {
    return null;
  }
  
  function resolveExports(name) {
    return modules[name];
  }
}

function buildModules() {
  return freezeObject({
    math: blessModule(require('./math')),
    array: blessModule(require('./array')),
    string: blessModule(require('./string'))
  });
}

function blessModule(module) {
  var result = {};
  for ( var key in module ) {
    var value = module[key];
    if ( typeof value === 'function') {
      result[key] = configurable(bless(value));
    }
    else {
      result[key] = value;
    }
  }
  return result;
}

// Add Default System Resolver
var systemResolver = createSystemResolver();
interpol.systemResolver = systemResolver;
interpol.resolvers().push(systemResolver);

// Exports
exports.createSystemResolver = createSystemResolver;
interpol.createSystemResolver = createSystemResolver;
