/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var isInterpolFunction = util.isInterpolFunction;
var stringify = util.stringify;

var nullWriter;

var Digits = "[1-9][0-9]*";
var Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*";
var Params = "%((%)|(" + Digits + ")|(" + Ident + "))?(([|]" + Ident + ")*)?";
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* */

var ParamRegex = new RegExp(Params, "m");

var TemplateCacheMax = 256;

/**
 * Builds a closure that will be used internally to support Interpol's
 * interpolation operations.  The returned closure may attach a flag
 * `__requiresContext` that identifies it as requiring an Interpol
 * context to fulfill its formatting.  This usually occurs when the
 * pipe `|` operator is used.
 *
 * @param {String} formatStr the String to be used for interpolation
 */

function buildFormatter(formatStr) {
  var funcs = [];
  var flen = 0;
  var autoIdx = 0;

  while ( formatStr && formatStr.length ) {
    var paramMatch = ParamRegex.exec(formatStr);
    if ( !paramMatch ) {
      funcs.push(createLiteralFunction(formatStr));
      break;
    }

    var match = paramMatch[0];
    var matchIdx = paramMatch.index;
    var matchLen = match.length;

    if ( matchIdx ) {
      funcs.push(createLiteralFunction(formatStr.substring(0, matchIdx)));
    }

    if ( paramMatch[2] === '%' ) {
      funcs.push(createLiteralFunction('%'));
      formatStr = formatStr.substring(matchIdx + matchLen);
      continue;
    }

    var idx = autoIdx++;
    if ( paramMatch[4] ) {
      idx = paramMatch[4];
    }
    else if ( paramMatch[3] ) {
      idx = parseInt(paramMatch[3], 10) - 1;
    }

    if ( paramMatch[5] ) {
      var formatters = paramMatch[5].slice(1).split('|');
      funcs.push(createPipedFunction(idx, formatters));
      templateFunction.__requiresContext = true;
    }
    else {
      funcs.push(createIndexedFunction(idx));
    }

    formatStr = formatStr.substring(matchIdx + matchLen);
  }
  flen = funcs.length;

  return templateFunction;

  function templateFunction(ctx, data) {
    if ( typeof data !== 'object' || data === null ) {
      data = [data];
    }

    var output = [];
    for ( var i = 0; i < flen; i++ ) {
      output[i] = funcs[i](ctx, data);
    }

    return output.join('');
  }

  function createLiteralFunction(literal) {
    return literalFunction;

    function literalFunction() {
      return literal;
    }
  }

  function createIndexedFunction(idx) {
    return indexedFunction;

    function indexedFunction(ctx, data) {
      return stringify(data[idx]);
    }
  }

  function createPipedFunction(idx, formatters) {
    var funcs = formatters.reverse();
    var flen = funcs.length - 1;

    if ( !nullWriter ) {
      var createNullWriter = require('./writers/null').createNullWriter;
      nullWriter = createNullWriter();
    }

    return pipedFunction;

    function pipedFunction(ctx, data) {
      var value = data[idx];
      for ( var i = flen; i >= 0; i-- ) {
        var funcName = funcs[i];
        var func = data[funcName];

        if ( func === undefined && ctx ) {
          // Only fall back to context if func is not in data at all
          func = ctx[funcName];
        }

        if ( !isInterpolFunction(func) ) {
          if ( ctx.__intExports ) {
            continue;
          }
          throw new Error("Attempting to call an unblessed function");
        }

        value = func(nullWriter, value);
      }
      return stringify(value);
    }
  }
}

function createFormatterCache() {
  var cache = {};
  var cacheCount = 0;

  return dynamicFormatter;

  function dynamicFormatter(ctx, formatStr, data) {
    // If we exhaust TemplateCacheMax, then something is clearly wrong here
    // and we're not using the evaluator for localized strings.  If we keep
    // caching, we're going to start leaking memory.  So this evaluator will
    // blow away the cache and start over
    var dynamicTemplate = cache[formatStr];

    if ( !dynamicTemplate ) {
      if ( cacheCount >= TemplateCacheMax ) {
        cache = {};
        cacheCount = 0;
      }
      // build and cache the dynamic template
      dynamicTemplate = buildFormatter(formatStr);
      cache[formatStr] = dynamicTemplate;
      cacheCount++;
    }

    return dynamicTemplate(ctx, data);
  }
}

// Exported Functions
exports.buildFormatter = buildFormatter;
exports.createFormatterCache = createFormatterCache;
