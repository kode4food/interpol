/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var types = require('./types');

var objectKeys = util.objectKeys;
var each = util.each;
var stringify = types.stringify;
var isInterpolFunction = types.isInterpolFunction;

var nullWriter;

var Digits = "[1-9][0-9]*";
var Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*";
var Params = "%((%)|(" + Digits + ")|(" + Ident + "))?(([|]" + Ident + ")*)?";
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* */

var ParamRegex = new RegExp(Params, "m");

var TemplateCacheMax = 256;

/**
 * Builds a closure that will be used internally to support Interpol's
 * interpolation operations.  The returned closure will attach flags
 * that identify any names or indexes that must be provided by interpol
 * to fulfill its formatting.
 *
 * @param {String} formatStr the String to be used for interpolation
 */
function buildFormatter(formatStr) {
  var funcs = [];
  var requiredIndexes = {};
  var requiredFunctions = {};
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
    requiredIndexes[idx] = true;

    if ( paramMatch[5] ) {
      var formatters = paramMatch[5].slice(1).split('|');
      funcs.push(createPipedFunction(idx, formatters));
    }
    else {
      funcs.push(createIndexedFunction(idx));
    }

    formatStr = formatStr.substring(matchIdx + matchLen);
  }
  flen = funcs.length;

  templateFunction.__intRequiredIndexes = objectKeys(requiredIndexes);
  templateFunction.__intRequiredFunctions = objectKeys(requiredFunctions);
  return templateFunction;

  function templateFunction(data, supportFunctions) {
    if ( typeof data !== 'object' || data === null ) {
      data = [data];
    }

    var output = [];
    for ( var i = 0; i < flen; i++ ) {
      output[i] = funcs[i](data, supportFunctions);
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

    function indexedFunction(data, supportFunctions) {
      return stringify(data[idx]);
    }
  }

  function createPipedFunction(idx, formatters) {
    var funcs = formatters.reverse();
    var flen = funcs.length - 1;

    // Register requirement on these formatters
    each(funcs, function (funcName) {
      requiredFunctions[funcName] = true;
    });

    if ( !nullWriter ) {
      var createNullWriter = require('./writers/null').createNullWriter;
      nullWriter = createNullWriter();
    }

    return pipedFunction;

    function pipedFunction(data, supportFunctions) {
      var value = data[idx];
      for ( var i = flen; i >= 0; i-- ) {
        var funcName = funcs[i];
        var func = data[funcName];

        if ( func === undefined && supportFunctions ) {
          // Only fall back to supportFunctions if func is not in data at all
          func = supportFunctions[funcName];
        }

        if ( !isInterpolFunction(func) ) {
          if ( supportFunctions.__intExports ) {
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

  function dynamicFormatter(formatStr, data, supportFunctions) {
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

    return dynamicTemplate(data, supportFunctions);
  }
}

// Exported Functions
exports.buildFormatter = buildFormatter;
exports.createFormatterCache = createFormatterCache;
