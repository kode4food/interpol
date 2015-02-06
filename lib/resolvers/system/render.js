/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../../types');
var bless = types.bless;
var isInterpolFunction = types.isInterpolFunction;

var noOp = bless(function () {});

function counter(writer, start, increment) {
  if ( typeof start !== 'number' || isNaN(start) ) {
    start = 0;
  }
  if ( typeof increment !== 'number' || isNaN(increment) ) {
    increment = 1;
  }
  return bless(counterInstance);

  function counterInstance() {
    var result = start;
    start += increment;
    return result;
  }
}

function evenOdd(writer, even, odd) {
  if ( even === undefined ) {
    even = 'even';
  }
  if ( odd === undefined ) {
    odd = 'odd';
  }

  var current = true;
  return bless(evenOddInstance);

  function evenOddInstance() {
    current = !current;
    return current ? odd : even;
  }
}

function separator(writer, sep) {
  var empty = '';
  if ( sep === undefined ) {
    sep = ', ';
  }
  else if ( typeof sep === 'function' ) {
    empty = noOp;
  }

  var first = true;
  return bless(separatorInstance);

  function separatorInstance() {
    if ( first ) {
      first = false;
      return empty;
    }
    return sep;
  }
}

// `pluralizer(value)` returns a pluralizing function that can be used to
// produce a string based on the cardinality of the passed value.
function pluralizer(writer, singular, plural) {
  var idx = isInterpolFunction(singular) ? 1 : 0;
  if ( plural === undefined && !idx ) {
    plural = singular + 's';
  }

  idx += isInterpolFunction(plural) ? 2 : 0;
  return bless([neither, singularOnly, pluralOnly, both][idx]);

  function neither(writer, value) {
    return value === 1 ? singular : plural;
  }

  function singularOnly(writer, value) {
    if ( value === 1 ) {
      return singular(writer, value);
    }
    return plural;
  }

  function pluralOnly(writer, value) {
    if ( value === 1 ) {
      return singular;
    }
    return plural(writer, value);
  }

  function both(writer, value) {
    var branch = value === 1 ? singular : plural;
    return branch(writer, value);
  }
}

// Exports
exports.counter = counter;
exports.evenOdd = evenOdd;
exports.separator = separator;
exports.pluralizer = pluralizer;
