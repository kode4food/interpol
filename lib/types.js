/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');

var isArray = util.isArray;

/**
 * Returns whether or not an Object is an Interpol Runtime instance.
 *
 * @param {Object} obj the Object to check
 */
function isInterpolRuntime(obj) {
  return typeof obj === 'object' && obj !== null && obj.__intRuntime;
}

/**
 * Returns whether or not a Function is a compiled Interpol Module.
 *
 * @param {Function} func the Function to check
 */
function isInterpolModule(func) {
  return typeof func === 'function' && func.__intModule;
}

/**
 * Returns whether or not a Function is 'blessed' as Interpol-compatible.
 *
 * @param {Function} func the Function to check
 */
function isInterpolFunction(func) {
  return typeof func === 'function' && func.__intFunction;
}

/**
 * Same as isInterpolFunction except that it's checking specifically for
 * a declared partial.
 *
 * @param {Function} func the Function to check
 */
function isInterpolPartial(func) {
  return typeof func === 'function' && func.__intFunction === 'part';
}

/**
 * 'bless' a Function as being Interpol-compatible.  This essentially means
 * that the Function must accept a Writer instance as the first argument, as
 * a writer will be passed to it by the compiled template.
 *
 * @param {Function} func the Function to 'bless'
 */
function bless(func) {
  if ( typeof func !== 'function' ) {
    throw new Error("Argument to bless must be a Function");
  }

  if ( func.__intFunction ) {
    return func;
  }

  blessedWrapper.__intFunction = 'wrap';
  return blessedWrapper;

  function blessedWrapper() {
    /* jshint validthis:true */
    return func.apply(this, arguments);
  }
}

var EscapeChars = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeAttribute(str) {
  return str.replace(/[&<>'"]/gm, function(ch) {
    return EscapeChars[ch];
  });
}

function escapeContent(str) {
  return str.replace(/[&<>]/gm, function(ch) {
    return EscapeChars[ch];
  });
}

/**
 * Stringify the provided value for Interpol's purposes.
 *
 * @param {Mixed} value the value to stringify
 */
function stringify(value) {
  var type = typeof value;
  switch ( type ) {
    case 'string':
      return value;

    case 'number':
      return value.toString();

    case 'boolean':
      return value ? 'true' : 'false';

    case 'object':
      if ( isArray(value) ) {
        var result = [];
        for ( var i = 0, len = value.length; i < len; i++ ) {
          result[i] = stringify(value[i]);
        }
        return result.join(' ');
      }
      return value !== null ? value.toString() : '';

    default:
      // catches 'undefined'
      return '';
  }
}

/**
 * Checks whether or not the provided value is *truthy* by Interpol's
 * standards.
 *
 * @param {Mixed} value the value to test
 * @returns {boolean} if the value constitutes a *truthy* one
 */
function isTruthy(value) {
  if ( !value ) {
    return false;
  }
  if ( isArray(value) ) {
    return value.length > 0;
  }
  return true;
}

function isFalsy(value) {
  if ( !value ) {
    return true;
  }
  if ( isArray(value) ) {
    return value.length === 0;
  }
  return false;
}

// Exported Functions
exports.isInterpolRuntime = isInterpolRuntime;
exports.isInterpolModule = isInterpolModule;
exports.isInterpolFunction = isInterpolFunction;
exports.isInterpolPartial = isInterpolPartial;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.bless = bless;
exports.isTruthy = isTruthy;
exports.isFalsy = isFalsy;
