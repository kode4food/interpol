/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , modules = require('../modules');

// Implementation ***********************************************************

function createMemoryResolver(options) {
  var cache = modules.createModuleCache();

  return {
    resolveModule: cache.getModule,
    resolveExports: cache.getExports,
    unregisterModule: cache.removeModule,
    registerModule: registerModule
  };

  function registerModule(name, module) {
    if ( typeof module === 'function' &&
         typeof module.exports === 'function' ) {
      cache.putModule(name, module);
      return;
    }

    if ( typeof module === 'string' ||
         typeof module.length === 'number' ) {
      cache.putModule(name, interpol(module));
      return;
    }

    throw new Error("Module not provided");
  }
}

// Add Default Memory Resolver
var memoryResolver = createMemoryResolver();
interpol.memoryResolver = memoryResolver;
interpol.resolvers().push(memoryResolver);

// Exports
exports.createMemoryResolver = createMemoryResolver;
interpol.createMemoryResolver = createMemoryResolver;
