/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util')
  , isArray = util.isArray;

function first(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  return value[0];
}

function join(writer, value, delim) {
  if ( isArray(value) ) {
    return value.join(delim || ' ');
  }
  return value;
}

function last(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  if ( value.length ) return value[value.length - 1];
  return null;
}

function length(writer, value) {
  return isArray(value) ? value.length : 0;
}

function empty(writer, value) {
  return !value || !value.length;
}

// Exports
exports.first = first;
exports.join = join;
exports.last = last;
exports.length = length;
exports.empty = empty;
