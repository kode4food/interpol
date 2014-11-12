/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var format = require('./format');
var match = require('./match');
var types = require('./types');

var createStringWriter = require('./writers/string').createStringWriter;
var nullWriter = require('./writers/null').createNullWriter();

var isInterpolRuntime = types.isInterpolRuntime;
var isInterpolPartial = types.isInterpolPartial;
var isInterpolFunction = types.isInterpolFunction;

var isArray = util.isArray;
var mixin = util.mixin;
var each = util.each;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;
var configure = util.configure;

var slice = Array.prototype.slice;

var globalOptions = { writer: null, errorCallback: null };
var globalContext = {};
var globalResolvers = [];

function noOp() {}
noOp.__intFunction = 'part';

function createRuntime(localOptions) {
  if ( isInterpolRuntime(localOptions) ) {
    return localOptions;
  }

  var options = mixin({}, globalOptions, localOptions);
  var resolvers = options.resolvers || globalResolvers;
  var cacheModules = options.cache;

  var resolveExports = resolve.bind(null, 'resolveExports');
  var resolveModule = resolve.bind(null, 'resolveModule');

  var runtime = {
    __intRuntime: true,

    options: options,
    resolvers: resolvers,

    extendObject: util.extendObject,
    mixin: util.mixin,
    isTruthy: types.isTruthy,
    isFalsy: types.isFalsy,

    buildFormatter: format.buildFormatter,
    createFormatterCache: format.createFormatterCache,
    isMatchingObject: match.isMatchingObject,
    buildMatcher: match.buildMatcher,

    resolveExports: resolveExports,
    resolveModule: resolveModule,
    buildImporter: buildImporter,
    defineModule: defineModule,
    definePartial: definePartial,
    defineGuardedPartial: defineGuardedPartial,
    cleanseArguments: cleanseArguments,

    getProperty: getProperty,
    loop: loop,
    exec: exec,
    bind: bind
  };

  return runtime;

  function resolve(methodName, moduleName) {
    for ( var i = resolvers.length - 1; i >= 0; i-- ) {
      var module = resolvers[i][methodName](moduleName, runtime, options);
      if ( module ) {
        return module;
      }
    }
    return undefined;
  }

  // where exports are actually resolved. raiseError will be false
  // if we're in the process of evaluating a template for the purpose
  // of yielding its exports
  function buildImporter(moduleName) {
    var importer = dynamicImporter;
    var module;

    return performImport;

    function performImport() {
      return importer();
    }

    function cachedImporter() {
      return module;
    }

    function dynamicImporter() {
      var module = resolveExports(moduleName);
      if ( !module ) {
        throw new Error("Module '" + moduleName + "' not resolved");
      }
      if ( cacheModules ) {
        importer = cachedImporter;
      }
      return module;
    }
  }
}

function options() {
  return globalOptions;
}

function context() {
  return globalContext;
}

function resolvers() {
  return globalResolvers;
}

function defineModule(template) {
  var exportedContext;
  templateInterface.__intModule = true;
  templateInterface.configure = configureTemplate;
  templateInterface.exports = templateExports;
  return templateInterface;

  function templateInterface(obj, localOptions) {
    var ctx = mixin(extendObject(globalContext), obj);
    var processingOptions = mixin({}, globalOptions, localOptions);

    // If no Writer is provided, create a throw-away Array Writer
    var writer = processingOptions.writer || createStringWriter();

    try {
      writer.startRender();
      template(ctx, writer);
      return writer.endRender();
    }
    catch ( err ) {
      if ( typeof processingOptions.errorCallback === 'function' ) {
        processingOptions.errorCallback(err, null);
        return;
      }
      // Re-raise if no callback
      throw err;
    }
  }

  /**
   * Returns a preconfigured version of the runtime template with a
   * default obj and options.  Convenient if you're doing DOM writing
   * or need to repeatedly call the template with the same Object.
   *
   * @param {Object} defaultObj default context Object to use
   * @param {Object} defaultOptions default Options to provide
   */
  function configureTemplate(defaultObj, defaultOptions) {
    return configure(template, 0, slice.call(arguments, 0));
  }

  /**
   * Returns the symbols (partials and assignments) that the runtime
   * template will product against an empty `{}` context Object.  This is
   * the method by which Interpol imports work.  Partials produced with
   * this method still have access to the global context.
   */
  function templateExports() {
    /* istanbul ignore if */
    if ( exportedContext ) {
      return exportedContext;
    }

    // `__intExports` is an indicator to evaluators that we're processing
    // exports and so they can be a bit lax about reporting errors or
    // resolving imports

    exportedContext = extendObject(globalContext);
    exportedContext.__intExports = true;
    template(exportedContext, nullWriter);
    delete exportedContext.__intExports;

    return exportedContext;
  }
}

function definePartial(partial) {
  partial.__intFunction = 'part';
  return partial;
}

function defineGuardedPartial(originalPartial, envelope) {
  if ( !isInterpolPartial(originalPartial) ) {
    originalPartial = noOp;
  }
  return definePartial(envelope(originalPartial));
}

function cleanseArguments(arr, startIdx) {
  for ( var i = startIdx, len = arr.length; i < len; i++ ) {
    if ( arr[i] === null ) {
      arr[i] = undefined;
    }
  }
}

function getProperty(obj, property) {
  if ( obj === undefined || obj === null ) {
    return undefined;
  }
  var res = obj[property];
  return res === null ? undefined : res;
}

function loop(data, loopCallback) {
  var i, len, name, value;

  if ( data === null || typeof data !== 'object' ) {
    return;
  }

  if ( isArray(data) ) {
    for ( i = 0, len = data.length; i < len; i++ ) {
      value = data[i];
      loopCallback(value === null ? undefined : value);
    }
  }
  else {
    var items = objectKeys(data);
    for ( i = 0, len = items.length; i < len; i++ ) {
      name = items[i];
      value = data[name];
      loopCallback({
        name: name,
        value: value === null ? undefined : value
      });
    }
  }
}

function exec(ctx, func, args) {
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return undefined;
    }
    throw new Error("Attempting to call an unblessed function");
  }
  return func.apply(null, args);
}

function bind(ctx, func, callArgs) {
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return undefined;
    }
    throw new Error("Attempting to bind an unblessed function");
  }

  var bound = configure(func, 1, callArgs);
  bound.__intFunction = func.__intFunction;
  return bound;
}

// Exported Functions
exports.createRuntime = createRuntime;
exports.options = options;
exports.context = context;
exports.resolvers = resolvers;
