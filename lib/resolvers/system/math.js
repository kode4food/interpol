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

var wrap = require('./wrap');

// If an Array, returns the average (mathematical mean) of value's elements
function avg(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) return 0;
  for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
  return r / l;
}

// If an Array, return the greatest value in it
function max(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  return Math.max.apply(Math, value);
}

// If an Array, return the mathematical median of value's elements
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

// If an Array, return the lowest value in it
function min(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  return Math.min.apply(Math, value);
}

// If an Array, return the mathematical sum of value's elements
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
exports.number = wrap(Number);       // Convert value to a Number
exports.abs = wrap(Math.abs);        // Return the absolute value
exports.acos = wrap(Math.acos);      // Return the arc-cosine
exports.asin = wrap(Math.asin);      // Return the arc-sine
exports.atan = wrap(Math.atan);      // Return the arc-tangent
exports.atan2 = wrap(Math.atan2);    // Return the arc-tangent of the coords
exports.ceil = wrap(Math.ceil);      // Round to the next highest integer
exports.cos = wrap(Math.cos);        // Return the cosine
exports.exp = wrap(Math.exp);        // Returns E to the power of x
exports.floor = wrap(Math.floor);    // Round to the next lowest integer
exports.log = wrap(Math.log);        // Return the natural logarithm
exports.pow = wrap(Math.pow);        // Return x raised to the power of y
exports.random = wrap(Math.random);  // Return a random number (0 <= x < 1)
exports.round = wrap(Math.round);    // Round up or down to the closest integer
exports.sin = wrap(Math.sin);        // Return the sine
exports.sqrt = wrap(Math.sqrt);      // Return the square root
exports.tan = wrap(Math.tan);        // Return the tangent

// Constants
exports.E = Math.E;              // Euler's Number
exports.LN2 = Math.LN2;          // Natural Logarithm of 2
exports.LN10 = Math.LN10;        // Natural Logarithm of 10
exports.LOG2E = Math.LOG2E;      // Base-2 Logarithm of E
exports.LOG10E = Math.LOG10E;    // Base-10 Logarithm of E
exports.PI = Math.PI;            // Pi
exports.SQRT1_2 = Math.SQRT1_2;  // Square Root of 1/2
exports.SQRT2 = Math.SQRT2;      // Square Root of 2
