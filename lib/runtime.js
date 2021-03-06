/*
 * Interpol (HTML Composition Language)
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
var isInterpolFunction = types.isInterpolFunction;
var isInterpolPartial = types.isInterpolPartial;
var isInterpolGenerator = types.isInterpolGenerator;
var stopIteration = types.stopIteration;
var bless = types.bless;

var util = require('./util');
var isArray = util.isArray;
var mixin = util.mixin;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;

var internalResolvers = require('./resolvers/internal');
var createSystemResolver = internalResolvers.createSystemResolver;
var createMemoryResolver = internalResolvers.createMemoryResolver;

var writers = require('./writers');
var createStringWriter = writers.createStringWriter;
var nullWriter = writers.createNullWriter();

var noOp = bless(function () {});

var slice = Array.prototype.slice;

function createRuntime(interpol, runtimeOptions) {
  if ( isInterpolRuntime(runtimeOptions) ) {
    return runtimeOptions;
  }

  var options = mixin({}, runtimeOptions);
  var cacheModules = options.cache;
  var createDefaultResolvers = !options.resolvers;
  var resolvers = createDefaultResolvers ? [] : options.resolvers;

  var resolveExports = createResolver('resolveExports');
  var resolveModule = createResolver('resolveModule');

  var runtime = {
    __intRuntime: true,
    interpol: interpol,

    options: getOptions,
    resolvers: getResolvers,

    extendObject: util.extendObject,
    mixin: util.mixin,
    isArray: util.isArray,

    isTruthy: types.isTruthy,
    isFalsy: types.isFalsy,
    isIn: types.isIn,

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

    getProperty: getProperty,
    getPath: getPath,
    bindPartial: bindPartial,
    
    loop: loop,
    exec: exec
  };

  if ( createDefaultResolvers ) {
    createSystemResolver(runtime);
    createMemoryResolver(runtime, true);
  }

  return runtime;

  function getOptions() {
    return options;
  }

  function getResolvers() {
    return resolvers;
  }

  function createResolver(methodName) {
    return resolve;

    function resolve(moduleName) {
      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        var module = resolvers[i][methodName](moduleName);
        if ( module ) {
          return module;
        }
      }
      return undefined;
    }
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
  var stringWriters = [];
  var stringWritersAvail = 0;
  return toString;

  function toString() {
    var writer;
    if ( stringWritersAvail ) {
      writer = stringWriters[--stringWritersAvail];
    }
    else {
      writer = createStringWriter();
    }
    try {
      func(writer);
      var result = writer.done();
      stringWriters[stringWritersAvail++] = writer;
      return result;
    }
    catch ( err ) {
      writer.reset();
      stringWriters[stringWritersAvail++] = writer;
      throw err;
    }
  }
}

function defineModule(template) {
  var stringWriters = [];
  var stringWritersAvail = 0;
  var defaultOptions = {};
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
    var writer = templateOptions.writer;
    var useStringWriter = !writer;

    try {
      if ( useStringWriter ) {
        if ( stringWritersAvail ) {
          writer = stringWriters[--stringWritersAvail];
        }
        else {
          writer = createStringWriter();
        }
        template(ctx, writer);
        var result = writer.done();
        stringWriters[stringWritersAvail++] = writer;
        return result;
      }
      template(ctx, writer);
      return writer.done();
    }
    catch ( err ) {
      writer.reset();
      if ( useStringWriter ) {
        stringWriters[stringWritersAvail++] = writer;
      }
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

function getProperty(obj, property) {
  if ( obj === undefined || obj === null ) {
    return undefined;
  }
  var res = obj[property];
  return res === null ? undefined : res;
}

function getPath(obj) {
  for ( var i = 1, len = arguments.length; i < len; i++ ) {
    if ( obj === undefined || obj === null ) {
      return undefined;
    }
    obj = obj[arguments[i]];
  }
  return obj === null ? undefined : obj;
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
    var applyArgs = argTemplate.slice(0).concat(slice.call(arguments, 1));
    applyArgs[0] = writer;
    return func.apply(this, applyArgs);
  }
}

function loop(data, loopCallback) {
  var i, len, name, value;

  if ( isArray(data) ) {
    for ( i = 0, len = data.length; i < len; i++ ) {
      value = data[i];
      loopCallback(value === null ? undefined : value);
    }
    return;
  }
  
  if ( typeof data === 'object' && data !== null ) {
    var items = objectKeys(data);
    for ( i = 0, len = items.length; i < len; i++ ) {
      name = items[i];
      value = data[name];
      loopCallback({
        name: name,
        value: value === null ? undefined : value
      });
    }
    return;
  }
  
  if ( isInterpolGenerator(data) ) {
    for ( value = data(); value !== stopIteration; value = data() ) {
      loopCallback(value);
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
