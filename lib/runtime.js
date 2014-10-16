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
  var runtimeOptions = mixin({}, globalOptions, localOptions);
  var cacheModules = runtimeOptions.cache;
  var runtimeResolvers = runtimeOptions.resolvers || globalResolvers;
  var runtimeContext = extendObject(runtimeOptions.context || globalContext);

  return {
    resolvers: function () { return runtimeResolvers; },
    context: function() { return runtimeContext; },
    options: function () { return runtimeOptions; },

    globalResolvers: resolvers,
    globalContext: context,
    globalOptions: options,

    extendObject: util.extendObject,
    mixin: util.mixin,
    isTruthy: util.isTruthy,

    buildFormatter: format.buildFormatter,
    buildFormatterCache: format.createFormatterCache,
    isMatchingObject: match.isMatchingObject,
    buildMatcher: match.buildMatcher,

    isInterpolPartial: isInterpolPartial,
    definePartial: definePartial,
    defineGuardedPartial: defineGuardedPartial,
    getProperty: getProperty,
    loop: loop,
    exec: exec,
    bind: bind
  };
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

function definePartial(ctx, name, partial) {
  ctx[name] = partial;
  partial.__intFunction = 'part';
  return partial;
}

function defineGuardedPartial(ctx, name, envelope) {
  var originalPartial = ctx[name];
  if ( !isInterpolPartial(originalPartial) ) {
    originalPartial = noOp;
  }
  definePartial(ctx, name, envelope(originalPartial));
}

function getProperty(obj, property) {
  if ( typeof obj === 'object' && obj !== null ) {
    return obj[property];
  }
  return null;
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

function exec(func, args) {
  if ( !isInterpolFunction(func) ) {
    throw new Error("Nope!");
  }
  return func.apply(null, args);
}

function bind(func, callArgs) {
  var bound = configure(func, 2, callArgs);
  bound.__intFunction = func.__intFunction;
  return bound;
}

// Exported Functions
exports.createRuntime = createRuntime;
