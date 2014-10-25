/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');

var slice = Array.prototype.slice;
var isArray = util.isArray;
var bless = util.bless;

/**
 * Creates a new MemoryResolver.  As its name implies, this resolver
 * allows one to register a module to be stored in memory.  A default
 * instance of this resolver is used to store the System Modules.
 * Because of its flexibility, it can also be used to store custom
 * modules and native JavaScript helpers.
 *
 * @param {function} interpol the Interpol Instance to use for compilation
 * @param {Object} [options] Options for generating the MemoryResolver
 */
function createMemoryResolver(interpol, options) {
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

  /**
   * Removes a module from the resolver cache.
   *
   * @param {String} name the name of the module to remove
   */
  function unregisterModule(name) {
    delete cache[normalizeModuleName(name)];
  }

  /**
   * Registers a module in the module cache.
   *
   * @param {String} name the name of the module to be registered
   * @param {Function|String|Object} module the module to register
   */
  function registerModule(name, module) {
    name = normalizeModuleName(name);

    // *Function* - A compiled Interpol closure
    if ( typeof module === 'function' &&
         typeof module.exports === 'function' ) {
      cache[name] = { module: module };
      return;
    }

    // *String* - An unparsed Interpol template
    if ( typeof module === 'string' ) {
      cache[name] = { module: interpol(module) };
      return;
    }

    // *Object* - A hash of Helpers (name->Function)
    if ( typeof module === 'object' && module !== null && !isArray(module) ) {
      cache[name] = { moduleExports: blessModule(module) };
      return;
    }

    throw new Error("Module not provided");
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

function normalizeModuleName(name) {
  return name.replace(/[/\\.]+/g, '/');
}

function registerResolver(interpol) {
  var defaultMemoryResolver = createMemoryResolver(interpol);
  interpol.resolvers().push(defaultMemoryResolver);
  interpol.registerModule = defaultMemoryResolver.registerModule;
  interpol.unregisterModule = defaultMemoryResolver.unregisterModule;
  interpol.createMemoryResolver = createMemoryResolver;
  interpol.defaultMemoryResolver = defaultMemoryResolver;
}

// Exported Functions
exports.createMemoryResolver = createMemoryResolver;
exports.registerResolver = registerResolver;
