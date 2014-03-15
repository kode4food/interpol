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

var wrapFunction = require('./wrap');

function avg(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) return 0;
  for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
  return r / l;
}

function count(writer, value) {
  return isArray(value) ? value.length : 0;
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
exports.count = count;
exports.max = max;
exports.median = median;
exports.min = min;
exports.sum = sum;

exports.number = wrapFunction(Number);
exports.abs = wrapFunction(Math.abs);
exports.acos = wrapFunction(Math.acos);
exports.asin = wrapFunction(Math.asin);
exports.atan = wrapFunction(Math.atan);
exports.atan2 = wrapFunction(Math.atan2);
exports.ceil = wrapFunction(Math.ceil);
exports.cos = wrapFunction(Math.cos);
exports.exp = wrapFunction(Math.exp);
exports.floor = wrapFunction(Math.floor);
exports.log = wrapFunction(Math.log);
exports.pow = wrapFunction(Math.pow);
exports.round = wrapFunction(Math.round);
exports.sin = wrapFunction(Math.sin);
exports.sqrt = wrapFunction(Math.sqrt);
exports.tan = wrapFunction(Math.tan);
