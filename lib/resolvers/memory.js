/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../types');
var util = require('../util');

var isInterpolModule = types.isInterpolModule;
var isArray = util.isArray;
var bless = types.bless;

/**
 * Creates a new MemoryResolver.  As its name implies, this resolver
 * allows one to register a module to be stored in memory.  A default
 * instance of this resolver is used to store the System Modules.
 * Because of its flexibility, it can also be used to store custom
 * modules and native JavaScript helpers.
 *
 * @param {Runtime} [runtime] Runtime owner for MemoryResolver
 * @param {boolean} [addRuntimeEntries] whether to add registerModule
 */
function createMemoryResolver(runtime, addRuntimeEntries) {
  var interpol = runtime.interpol;
  var cache = {};

  var resolver = {
    resolveModule: resolveModule,
    resolveExports: resolveExports,
    unregisterModule: unregisterModule,
    registerModule: registerModule
  };

  runtime.resolvers().push(resolver);
  if ( addRuntimeEntries ) {
    runtime.registerModule = registerModule;
    runtime.unregisterModule = unregisterModule;
  }
  return resolver;

  function resolveModule(name) {
    var result = cache[name];
    return result ? result.module : undefined;
  }

  function resolveExports(name) {
    var result = cache[name];
    if ( !result ) {
      return undefined;
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
    delete cache[name];
  }

  /**
   * Registers a module in the module cache.
   *
   * @param {String} name the name of the module to be registered
   * @param {Function|String|Object} module the module to register
   */
  function registerModule(name, module) {
    // A compiled Interpol Module function
    if ( isInterpolModule(module) ) {
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
      cache[name] = { module: createModuleStub(module) };
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

// Exported Functions
exports.createMemoryResolver = createMemoryResolver;
