/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util')
  , isInterpolFunction = util.isInterpolFunction
  , stringify = util.stringify;

var nullWriter;

var Digits = "[1-9][0-9]*"
  , Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*"
  , Params = "%((%)|("+Digits+")|("+Ident+"))?(([|]"+Ident+")*)?";
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* */

var ParamRegex = new RegExp(Params, "m");

/**
 * Builds a closure that will be used internally to support Interpol's
 * interpolation operations.  The returned closure may attach a flag
 * `__requiresContext` that identifies it as requiring an Interpol
 * context to fulfill its formatting.  This usually occurs when the
 * pipe `|` operator is used.
 *
 * @param {String} formatStr the String to be used for interpolation
 */

function buildTemplate(formatStr) {
  var funcs = []
    , flen = 0
    , autoIdx = 0;

  while ( formatStr && formatStr.length ) {
    var paramMatch = ParamRegex.exec(formatStr);
    if ( !paramMatch ) {
      funcs.push(createLiteralFunction(formatStr));
      break;
    }

    var match = paramMatch[0]
      , matchIdx = paramMatch.index
      , matchLen = match.length;

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

  function templateFunction(data, ctx) {
    if ( typeof data !== 'object' || data === null ) {
      data = [data];
    }

    var output = [];
    for ( var i = 0; i < flen; i++ ) {
      output[i] = funcs[i](data, ctx);
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
    var funcs = formatters.reverse()
      , flen = funcs.length - 1;

    if ( !nullWriter ) {
      var createNullWriter = require('./writers/null').createNullWriter;
      nullWriter = createNullWriter();
    }

    return pipedFunction;

    function pipedFunction(data, ctx) {
      var value = data[idx];
      for ( var i = flen; i >= 0; i-- ) {
        var funcName = funcs[i]
          , func = data[funcName];

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

// Exported Functions
exports.buildTemplate = buildTemplate;
