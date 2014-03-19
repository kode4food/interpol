/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util')
  , stringify = util.stringify;

var wrap = require('./wrap').wrap;

function lower(writer, value) {
  return stringify(value).toLowerCase();
}

function split(writer, value, delim, idx) {
  var val = stringify(value).split(delim || ' \n\r\t');
  return typeof idx !== 'undefined' ? val[idx] : val;
}

function title(writer, value) {
  return stringify(value).replace(/\w\S*/g, function (word) {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
}

function upper(writer, value) {
  return stringify(value).toUpperCase();
}

// Exports
exports.lower = lower;
exports.split = split;
exports.title = title;
exports.upper = upper;

exports.string = wrap(String);
