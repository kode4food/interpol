/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var ParamRegex = /(.?)%(([1-9][0-9]*)|([$_a-zA-Z][$_a-zA-Z0-9]*))?/;

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

    funcs.push(createIndexedFunction(idx));
    formatStr = formatStr.substring(matchIdx + matchLen);
  }
  flen = funcs.length;

  return templateFunction;

  function templateFunction(data) {
    if ( typeof data !== 'object' || data === null ) {
      data = [data];
    }

    var output = [];
    for ( var i = 0; i < flen; i++ ) {
      output[i] = funcs[i](data);
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
      return data[idx];
    }
  }
}

// Exports
exports.buildTemplate = buildTemplate;
