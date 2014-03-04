/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

// Implementation ***********************************************************

function createMemoryResolver(options) {
  var cache = util.createModuleCache();

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

// Exports
exports.createMemoryResolver = createMemoryResolver;
interpol.createMemoryResolver = createMemoryResolver;
