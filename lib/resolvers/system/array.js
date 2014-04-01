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

// Returns the first item of the provided array (or `null` if the
// array is empty).

function first(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  return value[0];
}

// Return the result of joining the elements of the provided array.
// Each element will be concatenated into a string separated by the
// specified delimiter (or ' ').

function join(writer, value, delim) {
  if ( isArray(value) ) {
    return value.join(delim || ' ');
  }
  return value;
}

// Returns the last item of the provided array (or `null` if the
// array is empty).

function last(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  if ( value.length ) return value[value.length - 1];
  return null;
}

// If it is an array, returns the length of the provided value
// (otherwise `0`).

function length(writer, value) {
  return isArray(value) ? value.length : 0;
}

// Returns true or false depending on whether or not the provided
// array is empty.

function empty(writer, value) {
  return !value || !value.length;
}

// Exports
exports.first = first;
exports.join = join;
exports.last = last;
exports.length = length;
exports.empty = empty;
