/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var format = require('../../format');
var types = require('../../types');
var wrap = require('./wrap');

var buildDeferredFormatter = format.buildDeferredFormatter;
var stringify = types.stringify;

// `build(value, supportFunctions)` converts the provided string and
// supportFunctions Object into an Interpol interpolation function.
function build(writer, value, supportFunctions) {
  var formatter = buildDeferredFormatter(stringify(value));
  return formatter(supportFunctions);
}

// `lower(value)` converts the provided string to lower-case and returns
// the result.
function lower(writer, value) {
  return stringify(value).toLowerCase();
}

// `split(delim, value)` splits the provided string wherever the
// specified delimiter (or whitespace) is encountered and returns the
// result.
function split(writer, delim, value) {
  if ( value === undefined ) {
    value = delim;
    delim = /\s*/;
  }
  return stringify(value).split(delim);
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
exports.build = build;
exports.lower = lower;
exports.split = split;
exports.title = title;
exports.upper = upper;
