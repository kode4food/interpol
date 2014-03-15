/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../../interpol')
  , util = require('../../util');

var freezeObject = util.freezeObject;

// Implementation ***********************************************************

function createSystemResolver() {
  var resolver = { resolveExports: resolveExports }
    , modules = buildModules();

  return resolver;

  function resolveExports(name) {
    return modules[name];
  }
}

function buildModules() {
  return freezeObject({
    math: blessModule(require('./math')),
    array: blessModule(require('./array')),
    string: blessModule(require('./string')),
    json: blessModule(require('./json'))
  });
}

function blessModule(module) {
  var result = {};
  for ( var key in module ) {
    result[key] = interpol.bless(module[key]);
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
