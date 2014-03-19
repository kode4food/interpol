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
    result[key] = configurable(bless(module[key]));
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
