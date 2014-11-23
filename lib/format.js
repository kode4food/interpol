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
var bind = util.bind;
var stringify = types.stringify;
var isInterpolFunction = types.isInterpolFunction;

var Digits = "0|[1-9][0-9]*";
var Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*";
var Params = "%((%)|(" + Digits + ")|(" + Ident + "))?(([|]" + Ident + ")*)?";
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* */

var ParamRegex = new RegExp(Params, "m");

var nullWriter = require('./writers/null').createNullWriter;

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

  var workStr = formatStr;
  while ( workStr && workStr.length ) {
    var paramMatch = ParamRegex.exec(workStr);
    if ( !paramMatch ) {
      funcs.push(createLiteralFunction(workStr));
      break;
    }

    var match = paramMatch[0];
    var matchIdx = paramMatch.index;
    var matchLen = match.length;

    if ( matchIdx ) {
      funcs.push(createLiteralFunction(workStr.substring(0, matchIdx)));
    }

    if ( paramMatch[2] === '%' ) {
      funcs.push(createLiteralFunction('%'));
      workStr = workStr.substring(matchIdx + matchLen);
      continue;
    }

    var idx = autoIdx++;
    if ( paramMatch[4] ) {
      idx = paramMatch[4];
    }
    else if ( paramMatch[3] ) {
      idx = parseInt(paramMatch[3], 10);
    }
    requiredIndexes[idx] = true;

    if ( paramMatch[5] ) {
      var formatters = paramMatch[5].slice(1).split('|');
      funcs.push(createPipedFunction(idx, formatters));
    }
    else {
      funcs.push(createIndexedFunction(idx));
    }

    workStr = workStr.substring(matchIdx + matchLen);
  }
  flen = funcs.length;

  formatFunction.__intRequiredIndexes = objectKeys(requiredIndexes);
  formatFunction.__intRequiredFunctions = objectKeys(requiredFunctions);
  formatFunction.toString = toString;
  return formatFunction;

  function toString() {
    return formatStr;
  }

  function formatFunction(supportFunctions, writer, data) {
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

    function indexedFunction(data) {
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

    return pipedFunction;

    function pipedFunction(data, supportFunctions) {
      var value = data[idx];
      for ( var i = flen; i >= 0; i-- ) {
        var funcName = funcs[i];
        var func = supportFunctions[funcName];

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

function buildDeferredFormatter(formatStr, supportFunctions) {
  var formatter = buildFormatter(formatStr);
  if ( supportFunctions !== undefined ) {
    var bound = bind(formatter, supportFunctions);
    bound.__intFunction = 'format';
    bound.toString = formatter.toString;
    return bound;
  }
  return deferredFormatter;

  function deferredFormatter(supportFunctions) {
    var bound = bind(formatter, supportFunctions);
    bound.__intFunction = 'format';
    bound.toString = formatter.toString;
    return bound;
  }
}

function buildImmediateFormatter(formatStr, supportFunctions) {
  var formatter = buildFormatter(formatStr);
  if ( supportFunctions !== undefined ) {
    return bind(formatter, supportFunctions, undefined);
  }
  return immediateFormatter;

  function immediateFormatter(supportFunctions, data) {
    return formatter(supportFunctions, undefined, data);
  }
}

// Exported Functions
exports.buildFormatter = buildFormatter;
exports.buildDeferredFormatter = buildDeferredFormatter;
exports.buildImmediateFormatter = buildImmediateFormatter;
