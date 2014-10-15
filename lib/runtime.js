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
var configure = util.configure;
var each = util.each;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;
var isInterpolFunction = util.isInterpolFunction;
var createStaticMixin = util.createStaticMixin;
var buildTemplate = format.buildTemplate;
var isMatchingObject = match.isMatchingObject;
var buildMatcher = match.buildMatcher;

var TemplateCacheMax = 256;

var slice = Array.prototype.slice;

var globalOptions = { writer: null, errorCallback: null };
var globalContext = {};
var globalResolvers = [];

function noOp() {}
noOp.__intFunction = 'part';

function buildRuntime(localOptions) {
  var runtimeOptions = mixin({}, globalOptions, localOptions);
  var cacheModules = runtimeOptions.cache;
  var runtimeResolvers = runtimeOptions.resolvers || globalResolvers;
  var runtimeContext = extendObject(runtimeOptions.context || globalContext);

  var runtime = {
    resolvers: function () { return runtimeResolvers; },
    context: function() { return runtimeContext; },
    options: function () { return runtimeOptions; },
    definePartial: definePartial,
    defineGuardedPartial: defineGuardedPartial
  };

  return runtime;

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

function options() {
  return globalOptions;
}

function context() {
  return globalContext;
}

function resolvers() {
  return globalResolvers;
}

// Exported Functions
exports.buildRuntime = buildRuntime;
exports.options = options;
exports.context = context;
exports.resolvers = resolvers;
exports.definePartial = definePartial;
exports.defineGuardedPartial = defineGuardedPartial;
