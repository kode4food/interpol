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

var slice = Array.prototype.slice
  , isArray = util.isArray
  , isInterpolJSON = util.isInterpolJSON
  , bless = util.bless
  , configure = util.configure;

// Implementation ***********************************************************

function createMemoryResolver(options) {
  var cache = {};

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports,
    unregisterModule: unregisterModule,
    registerModule: registerModule
  };

  function resolveModule(name) {
    var result = cache[name];
    return result ? result.module : null;
  }

  function resolveExports(name) {
    var result = cache[name];
    if ( !result ) {
      return null;
    }

    if ( result.moduleExports ) {
      return result.moduleExports;
    }

    var moduleExports = result.moduleExports = result.module.exports();
    return moduleExports;
  }

  function unregisterModule(name) {
    delete cache[name];
  }
   
  function registerModule(name, module) {
    if ( typeof module === 'function' &&
         typeof module.exports === 'function' ) {
      cache[name] = { module: module };
      return;
    }

    if ( typeof module === 'string' || isInterpolJSON(module) ) {
      cache[name] = { module: interpol(module) };
      return;
    }

    if ( typeof module === 'object' && !isArray(module) ) {
      cache[name] = { moduleExports: blessModule(module) };
      return;
    }

    throw new Error("Module not provided");
  }
}

// Utilities ****************************************************************

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

// Add Default Memory Resolver
var defaultMemoryResolver = createMemoryResolver();
interpol.resolvers().push(defaultMemoryResolver);
interpol.registerModule = defaultMemoryResolver.registerModule;
interpol.unregisterModule = defaultMemoryResolver.unregisterModule;

// Exports
exports.defaultMemoryResolver = defaultMemoryResolver;
exports.createMemoryResolver = createMemoryResolver;
interpol.createMemoryResolver = createMemoryResolver;
