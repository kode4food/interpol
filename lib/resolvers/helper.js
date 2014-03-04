/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol');

// Implementation ***********************************************************

function createHelperResolver(options) {
  options = options || {};

  var moduleName = options.name || 'helpers'
    , moduleExports = {};

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports,
    registerHelper: registerHelper,
    unregisterHelper: unregisterHelper
  };

  function resolveModule(name) {
    return null;
  }

  function resolveExports(name) {
    return name === moduleName ? moduleExports : null;
  }

  function registerHelper(name, func) {
    if ( typeof name === 'function' ) {
      func = name;
      if ( !func.name ) {
        throw new Error("Function requires a name");
      }
      name = func.name;
    }
    moduleExports[name] = interpol.bless(func);
  }

  function unregisterHelper(name) {
    if ( typeof name === 'function' ) {
      name = name.name;
    }
    if ( name ) {
      delete moduleExports[name];
    }
  }
}

// Add Default Helper Resolver
var helperResolver = createHelperResolver();
interpol.helperResolver = helperResolver;
interpol.resolvers().push(helperResolver);

// Exports
interpol.createHelperResolver = createHelperResolver;
exports.createHelperResolver = createHelperResolver;
