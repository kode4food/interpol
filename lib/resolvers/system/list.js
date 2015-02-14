/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util');
var objectKeys = util.objectKeys;
var isArray = util.isArray;

// `first(value)` returns the first item of the provided array (or `null` if
// the array is empty).
function first(writer, value) {
  if ( isArray(value) ) {
    return value[0];
  }
  if ( typeof value === 'object' && value !== null ) {
    var name = objectKeys(value)[0];
    var val = value[name];
    return {
        name: name,
        value: val === null ? undefined : val
    };
  }
  return value;
}

// `join(delim, value)` returns the result of joining the elements of the
// provided array. Each element will be concatenated into a string separated
// by the specified delimiter (or ' ').
function join(writer, delim, value) {
  if ( value === undefined ) {
    value = delim;
    delim = ' ';
  }
  if ( isArray(value) ) {
    return value.join(delim);
  }
  return value;
}

// `last(value)` returns the last item of the provided array (or `null` if
// the array is empty).
function last(writer, value) {
  if ( isArray(value) ) {
    return value[value.length - 1];
  }
  if ( typeof value === 'object' && value !== null ) {
    var keys = objectKeys(value);
    var name = keys[keys.length - 1];
    var val = value[name];
    return {
        name: name,
        value: val === null ? undefined : val
    };
  }
  return value;
}

// `length(value)` if it is an array, returns the length of the provided
// value, if an object, the number of keys, otherwise `0`.
function length(writer, value) {
  if ( isArray(value) ) {
    return value.length;
  }
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value).length;
  }
  return 0;
}

// `empty(value)` returns true or false depending on whether or not the
// provided array is empty.
function empty(writer, value) {
  if ( isArray(value) ) {
    return !value.length;
  }
  if ( typeof value === 'object' && value !== null ) {
    return !objectKeys(value).length;
  }
  return true;
}

// `keys(value)` returns the keys of the Object or indexes of the Array
// passed to it.  If the Array is sparse (has gaps) it will only return
// the indexes with assigned values.
function keys(writer, value) {
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value);
  }
  return undefined;
}

// values(value)` returns the values of the Object or Array passed to
// it.  If the array is sparse (has gaps) it will only return the
// assigned values.
function values(writer, value) {
  if ( typeof value !== 'object' || value === null ) {
    return undefined;
  }
  var keys = objectKeys(value);
  var result = [];
  for ( var i = 0, len = keys.length; i < len; i++ ) {
    result[i] = value[keys[i]];
  }
  return result;
}

// Exports
exports.first = first;
exports.join = join;
exports.last = last;
exports.length = length;
exports.empty = empty;
exports.keys = keys;
exports.values = values;
