/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util')
  , stringify = util.stringify;

var wrap = require('./wrap');

// `lower(value)` converts the provided string to lower-case and returns
// the result.
function lower(writer, value) {
  return stringify(value).toLowerCase();
}

// `split(value, delim, idx)` splits the provided string wherever the
// specified delimiter (or whitespace) is encountered and returns the
// result.
function split(writer, value, delim, idx) {
  var val = stringify(value).split(delim || ' \n\r\t');
  return typeof idx !== 'undefined' ? val[idx] : val;
}

// `title(value)` converts the provided string to title-case and returns
// the result.  Title case converts the first character of each word to
// upper-case, and the rest to lower-case.
function title(writer, value) {
  return stringify(value).replace(/\w\S*/g, function (word) {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
}

// `upper(value)` converts the provided string to upper-case and returns
// the result.
function upper(writer, value) {
  return stringify(value).toUpperCase();
}

// `string(value)` converts value to a String
exports.string = wrap(String);

// Exported Functions
exports.lower = lower;
exports.split = split;
exports.title = title;
exports.upper = upper;
