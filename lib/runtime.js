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

var createStringWriter = require('./writers/string').createStringWriter;
var nullWriter = require('./writers/null').createNullWriter();

var isArray = util.isArray;
var mixin = util.mixin;
var each = util.each;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;
var configure = util.configure;
var isInterpolFunction = util.isInterpolFunction;

var slice = Array.prototype.slice;

var globalOptions = { writer: null, errorCallback: null };
var globalContext = {};
var globalResolvers = [];

function noOp() {}
noOp.__intFunction = 'part';

function createRuntime(localOptions) {
  var options = mixin({}, globalOptions, localOptions);
  var cacheModules = options.cache;
  var resolvers = options.resolvers || globalResolvers;
  var context = extendObject(options.context || globalContext);

  return {
    resolvers: function () { return resolvers; },
    context: function() { return context; },
    options: function () { return options; },

    extendObject: util.extendObject,
    mixin: util.mixin,
    isTruthy: util.isTruthy,
    isFalsy: util.isFalsy,

    buildFormatter: format.buildFormatter,
    createFormatterCache: format.createFormatterCache,
    isMatchingObject: match.isMatchingObject,
    buildMatcher: match.buildMatcher,

    isInterpolPartial: isInterpolPartial,
    buildImporter: buildImporter,
    defineTemplate: defineTemplate,
    definePartial: definePartial,
    defineGuardedPartial: defineGuardedPartial,

    handleNil: handleNil,
    getProperty: getProperty,
    loop: loop,
    exec: exec,
    bind: bind
  };

  // where exports are actually resolved. raiseError will be false
  // if we're in the process of evaluating a template for the purpose
  // of yielding its exports
  function buildImporter(moduleName) {
    var importer = dynamicImporter;
    var module;

    return performImport;

    function performImport(ctx) {
      return importer(ctx);
    }

    function cachedImporter(ctx) {
      return module;
    }

    function dynamicImporter(ctx) {
      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        module = resolvers[i].resolveExports(moduleName, options);
        if ( module ) {
          break;
        }
      }
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

function isInterpolPartial(func) {
  return typeof func === 'function' && func.__intFunction === 'part';
}

function defineTemplate(template) {
  var exportedContext;
  template.configure = configureTemplate;
  template.exports = templateExports;
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

function isNil(value) {
  return value === undefined || value === null;
}

function handleNil(value) {
  return value === null ? undefined : value;
}

function getProperty(obj, property) {
  if ( isNil(obj) ) {
    return undefined;
  }
  return handleNil(obj[property]);
}

function loop(collection, state, loopCallback, elseCallback) {
  if ( typeof state === 'function' ) {
    elseCallback = loopCallback;
    loopCallback = state;
    state = [];
  }
  if ( !isArray(collection) || !collection.length ) {
    return;
  }
  for ( var i = 0, len = collection.length; i < len; i++ ) {
    loopCallback(collection[i], state);
  }
  if ( !state[0] && elseCallback ) {
    elseCallback();
  }
}

function exec(ctx, func, args) {
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return null;
    }
    throw new Error("Attempting to call an unblessed function");
  }
  return func.apply(null, args);
}

function bind(ctx, func, callArgs) {
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return null;
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
