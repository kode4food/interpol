/*
 * Interpol (HTML Composition Language)
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

var Digits = "0|[1-9][0-9]*";
var Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*";
var Pipes = "([|]" + Ident + ")*";
var Term = ";?";
var Params = "%((%)|(" + Digits + ")|(" + Ident + "))?(" + Pipes + ")?" + Term;
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* ";"? */

var ParamRegex = new RegExp(Params, "m");

var nullWriter = require('./writers/null').createNullWriter();

/**
 * Builds a closure that will be used internally to support Interpol's
 * interpolation operations.  The returned closure will attach flags
 * that identify any names or indexes that must be provided by interpol
 * to fulfill its formatting.
 *
 * @param {String} formatStr the String to be used for interpolation
 */
function buildFormatter(formatStr) {
  var components = [];
  var requiredIndexes = {};
  var requiredFunctions = {};
  var clen = 0;
  var autoIdx = 0;

  var workStr = formatStr;
  while ( workStr && workStr.length ) {
    var paramMatch = ParamRegex.exec(workStr);
    if ( !paramMatch ) {
      components.push(createLiteralComponent(workStr));
      break;
    }

    var match = paramMatch[0];
    var matchIdx = paramMatch.index;
    var matchLen = match.length;

    if ( matchIdx ) {
      components.push(createLiteralComponent(workStr.substring(0, matchIdx)));
    }

    if ( paramMatch[2] === '%' ) {
      components.push(createLiteralComponent('%'));
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
      components.push(createPipedComponent(idx, formatters));
    }
    else {
      components.push(createIndexedComponent(idx));
    }

    workStr = workStr.substring(matchIdx + matchLen);
  }
  clen = components.length;

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

    var result = '';
    for ( var i = 0; i < clen; i++ ) {
      var component = components[i];
      switch ( component[0] ) {
        case 0: result += component[1]; break;
        case 1: result += stringify(data[component[1]]); break;
        case 2: result += component[1](data, supportFunctions);
      }
    }
    return result;
  }

  function createLiteralComponent(literal) {
    return [0, literal];
  }

  function createIndexedComponent(idx) {
    return [1, idx];
  }

  function createPipedComponent(idx, formatters) {
    var funcs = formatters.reverse();
    var flen = funcs.length - 1;

    // Register requirement on these formatters
    each(funcs, function (funcName) {
      requiredFunctions[funcName] = true;
    });

    return [2, pipedFunction];

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
  supportedFormatter.__intFunction = 'format';
  supportedFormatter.toString = formatter.toString;
  if ( supportFunctions !== undefined ) {
    return supportedFormatter;
  }
  return deferredFormatter;

  function supportedFormatter(writer, data) {
    return formatter(supportFunctions, writer, data);
  }
  
  function deferredFormatter(_supportFunctions) {
    supportFunctions = _supportFunctions;
    return supportedFormatter;
  }
}

function buildImmediateFormatter(formatStr, supportFunctions) {
  var formatter = buildFormatter(formatStr);
  if ( supportFunctions !== undefined ) {
    return supportedFormatter;
  }
  return immediateFormatter;

  function supportedFormatter(data) {
    return formatter(supportFunctions, undefined, data);
  }
  
  function immediateFormatter(supportFunctions, data) {
    return formatter(supportFunctions, undefined, data);
  }
}

// Exported Functions
exports.buildFormatter = buildFormatter;
exports.buildDeferredFormatter = buildDeferredFormatter;
exports.buildImmediateFormatter = buildImmediateFormatter;
