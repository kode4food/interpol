/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var format = require('./format');
var match = require('./match');

var types = require('./types');
var isInterpolRuntime = types.isInterpolRuntime;
var isInterpolPartial = types.isInterpolPartial;
var isInterpolFunction = types.isInterpolFunction;
var bless = types.bless;

var util = require('./util');
var isArray = util.isArray;
var slice = util.slice;
var mixin = util.mixin;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;
var bind = util.bind;

var internalResolvers = require('./resolvers/internal');
var createSystemResolver = internalResolvers.createSystemResolver;
var createMemoryResolver = internalResolvers.createMemoryResolver;

var writers = require('./writers');
var createStringWriter = writers.createStringWriter;
var nullWriter = writers.createNullWriter();

var noOp = bless(function () {});
var defaultOptions = {};

function createRuntime(interpol, runtimeOptions) {
  if ( isInterpolRuntime(runtimeOptions) ) {
    return runtimeOptions;
  }

  var options = mixin({}, runtimeOptions);
  var cacheModules = options.cache;
  var createResolvers = !options.resolvers;
  var resolvers = createResolvers ? [] : options.resolvers;

  var resolveExports = bind(resolve, 'resolveExports');
  var resolveModule = bind(resolve, 'resolveModule');

  var runtime = {
    __intRuntime: true,
    interpol: interpol,

    options: getOptions,
    resolvers: getResolvers,

    extendObject: util.extendObject,
    mixin: util.mixin,
    isTruthy: types.isTruthy,
    isFalsy: types.isFalsy,

    immediateFormatter: format.buildImmediateFormatter,
    deferredFormatter: format.buildDeferredFormatter,

    matches: match.matches,
    matcher: match.matcher,

    resolveExports: resolveExports,
    resolveModule: resolveModule,
    importer: buildImporter,
    defineModule: defineModule,
    definePartial: definePartial,
    defineGuardedPartial: defineGuardedPartial,
    cleanseArguments: cleanseArguments,

    getProperty: getProperty,
    bindPartial: bindPartial,
    loop: loop,
    exec: exec
  };

  if ( createResolvers ) {
    createSystemResolver(runtime);
    createMemoryResolver(runtime);
  }

  return runtime;

  function getOptions() {
    return options;
  }

  function getResolvers() {
    return resolvers;
  }

  function resolve(methodName, moduleName) {
    for ( var i = resolvers.length - 1; i >= 0; i-- ) {
      var module = resolvers[i][methodName](moduleName);
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
      module = resolveExports(moduleName);
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

function createToString(func) {
  return toString;

  function toString() {
    var writer = createStringWriter();
    writer.startRender();
    func(writer);
    return writer.endRender();
  }
}

function defineModule(template) {
  var exportedContext;
  templateInterface.__intModule = true;
  templateInterface.exports = templateExports;
  return templateInterface;

  function templateInterface(obj, templateOptions) {
    var ctx = obj ? extendObject(obj) : {};
    if ( !templateOptions ) {
      templateOptions = defaultOptions;
    }

    // If no Writer is provided, create a throw-away Array Writer
    var writer = templateOptions.writer || createStringWriter();

    try {
      writer.startRender();
      template(ctx, writer);
      return writer.endRender();
    }
    catch ( err ) {
      if ( typeof templateOptions.errorCallback === 'function' ) {
        templateOptions.errorCallback(err);
        return;
      }
      // Re-raise if no callback
      throw err;
    }
  }

  /**
   * Returns the symbols (partials and assignments) that the runtime
   * template will product against an empty `{}` context Object.  This is
   * the method by which Interpol imports work.  Partials produced with
   * this method still have access to the global context.
   */
  function templateExports() {
    /* istanbul ignore if: guard */
    if ( exportedContext ) {
      return exportedContext;
    }

    // `__intExports` is an indicator to evaluators that we're processing
    // exports and so they can be a bit lax about reporting errors or
    // resolving imports

    exportedContext = {};
    exportedContext.__intExports = true;
    template(exportedContext, nullWriter);
    delete exportedContext.__intExports;

    return exportedContext;
  }
}

function definePartial(partial) {
  partial.__intFunction = 'part';
  partial.toString = createToString(partial);
  return partial;
}

function defineGuardedPartial(originalPartial, envelope) {
  if ( !isInterpolPartial(originalPartial) ) {
    originalPartial = noOp;
  }
  return definePartial(envelope(originalPartial));
}

/* istanbul ignore next: sanity checker */
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

function bindPartial(ctx, func, callArgs) {
  /* istanbul ignore if: short-circuit */
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return undefined;
    }
    throw new Error("Attempting to bind an unblessed function");
  }

  var argTemplate = [undefined].concat(callArgs);
  boundPartial.__intFunction = func.__intFunction;
  boundPartial.toString = createToString(boundPartial);
  return boundPartial;

  function boundPartial(writer) {
    /* jshint validthis:true */
    var applyArgs = slice(argTemplate).concat(slice(arguments, 1));
    applyArgs[0] = writer;
    return func.apply(this, applyArgs);
  }
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
  /* istanbul ignore if: short-circuit */
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return undefined;
    }
    throw new Error("Attempting to call an unblessed function");
  }
  return func.apply(null, args);
}

// Exported Functions
exports.createRuntime = createRuntime;
