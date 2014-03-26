/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util')
  , isArray = util.isArray;

var wrap = require('./wrap');

function avg(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) return 0;
  for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
  return r / l;
}

function max(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  return Math.max.apply(Math, value);
}

function median(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) return 0;
  var temp = value.slice(0).order();
  if ( temp.length % 2 === 0 ) {
    var mid = temp.length / 2;
    return (temp[mid - 1] + temp[mid]) / 2;
  }
  return temp[(temp.length + 1) / 2];
}

function min(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  return Math.min.apply(Math, value);
}

function sum(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  for ( var i = 0, res = 0, l = value.length; i < l; res += value[i++] );
  return res;
}

// Exports
exports.avg = avg;
exports.max = max;
exports.median = median;
exports.min = min;
exports.sum = sum;

// Math functions
exports.number = wrap(Number);
exports.abs = wrap(Math.abs);
exports.acos = wrap(Math.acos);
exports.asin = wrap(Math.asin);
exports.atan = wrap(Math.atan);
exports.atan2 = wrap(Math.atan2);
exports.ceil = wrap(Math.ceil);
exports.cos = wrap(Math.cos);
exports.exp = wrap(Math.exp);
exports.floor = wrap(Math.floor);
exports.log = wrap(Math.log);
exports.pow = wrap(Math.pow);
exports.random = wrap(Math.random);
exports.round = wrap(Math.round);
exports.sin = wrap(Math.sin);
exports.sqrt = wrap(Math.sqrt);
exports.tan = wrap(Math.tan);

// Constants
exports.E = Math.E;
exports.LN2 = Math.LN2;
exports.LN10 = Math.LN10;
exports.LOG2E = Math.LOG2E;
exports.LOG10E = Math.LOG10E;
exports.PI = Math.PI;
exports.SQRT1_2 = Math.SQRT1_2;
exports.SQRT2 = Math.SQRT2;
