/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var wrapFunction = require('./wrap');

function lower(writer, value) {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

function split(writer, value, delim, idx) {
  var val = String(value).split(delim || ' \n\r\t');
  return typeof idx !== 'undefined' ? val[idx] : val;
}

function title(writer, value) {
  if ( typeof value !== 'string' ) return value;
  return value.replace(/\w\S*/g, function (word) {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
}

function upper(writer, value) {
  return typeof value === 'string' ? value.toUpperCase() : value;
}

// Exports
exports.lower = lower;
exports.split = split;
exports.title = title;
exports.upper = upper;

exports.string = wrapFunction(String);
