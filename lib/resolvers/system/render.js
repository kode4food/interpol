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
  if ( typeof even === 'undefined' ) {
    even = 'even';
  }
  if ( typeof odd === 'undefined' ) {
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

// Exports
exports.counter = counter;
exports.evenOdd = evenOdd;
exports.separator = separator;
