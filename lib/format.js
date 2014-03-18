/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('./util')
  , stringify = util.stringify;

var nullWriter;

var Digits = "[1-9][0-9]*"
  , Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*"
  , Params = "(.?)%(("+Digits+")|("+Ident+"))?(([|]"+Ident+")*)?";
             // "%" ( digits | identifier )? ( "|" identifier )*

var ParamRegex = new RegExp(Params);

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
      , matchIdx = paramMatch.index + paramMatch[1].length
      , matchLen = match.length - paramMatch[1].length;

    if ( paramMatch[1] === '%' ) {
      funcs.push(createLiteralFunction(formatStr.substring(0, matchIdx)));
      formatStr = formatStr.substring(matchIdx + matchLen);
      continue;
    }

    if ( matchIdx ) {
      funcs.push(createLiteralFunction(formatStr.substring(0, matchIdx)));
    }

    var idx = autoIdx++;
    if ( typeof paramMatch[4] !== 'undefined' ) {
      idx = paramMatch[4];
    }
    else if ( typeof paramMatch[3] !== 'undefined' ) {
      idx = parseInt(paramMatch[3], 10) - 1;
    }

    if ( typeof paramMatch[5] !== 'undefined' ) {
      var formatters = paramMatch[5].slice(1).split('|');
      funcs.push(createPipedFunction(idx, formatters));
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
          , func = data[funcName]
          , type = typeof func;

        if ( type === 'undefined' ) {
          // Only fall back to context if func is not in data at all
          func = ctx[funcName];
          type = typeof func;
        }

        if ( type !== 'function' || !func.__interpolFunction ) {
          if ( ctx.__interpolExports ) {
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

// Exports
exports.buildTemplate = buildTemplate;
