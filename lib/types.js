/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');

var isArray = util.isArray;
var objectKeys = util.objectKeys;
var bind = util.bind;

function emptyString() {
  return '';
}

/**
 * Returns whether or not an Object is an Interpol Runtime instance.
 *
 * @param {Object} obj the Object to check
 */
function isInterpolRuntime(obj) {
  return typeof obj === 'object' && obj !== null && obj.__intRuntime;
}

/**
 * Returns whether or not an Object is an Interpol Node Module.
 *
 * @param {Object} obj the Object to check
 */
function isInterpolNodeModule(obj) {
  return typeof obj === 'object' && obj !== null && obj.__intNodeModule;
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
 * 'bless' a Function or String as being Interpol-compatible.  For a Function
 * this essentially means that it must accept a Writer instance as the first
 * argument, as a writer will be passed to it by the compiled template.  For
 * a String, it will mark the String as capable of being rendered without
 * escaping.
 *
 * @param {Function|String} value the String or Function to 'bless'
 */
function bless(value) {
  var type = typeof value;

  switch ( type ) {
    case 'string':
      var blessString = function () { return value; };
      blessString.toString = blessString;
      blessString.__intFunction = 'string';
      return blessString;

    case 'function':
      if ( value.__intFunction ) {
        return value;
      }
      var blessedFunc = bind(value);
      blessedFunc.__intFunction = 'wrap';
      blessedFunc.toString = emptyString;
      return blessedFunc;

    default:
      throw new Error("Argument to bless must be a Function or String");
  }
}

function stringifyArray(value, stringifier) {
  var result = [];
  for ( var i = 0, len = value.length; i < len; i++ ) {
    result[i] = stringifier(value[i]);
  }
  return result.join(' ');
}

/**
 * Stringify the provided value for Interpol's purposes.
 *
 * @param {Mixed} value the value to stringify
 */
function stringify(value) {
  switch ( typeof value ) {
    case 'string':
      return value;

    case 'number':
      return '' + value;

    case 'boolean':
      return value ? 'true' : 'false';

    case 'function':
      return value.__intFunction ? value.toString() : '';

    case 'object':
      if ( isArray(value) ) {
        return stringifyArray(value, stringify);
      }
      return value === null ? '' : value.toString();

    default:
      return '';
  }
}

var ampRegex = /&/g;
var ltRegex = /</g;
var gtRegex = />/g;
var quoteRegex = /\"/g;
var aposRegex = /\'/g;

/**
 * Escape the provided value for the purposes of rendering it as an HTML
 * attribute.
 *
 * @param {Mixed} value the value to escape
 */
var escapeAttribute = createEscapedStringifier(/[&<>'"]/g, replaceAttribute);

/**
 * Escape the provided value for the purposes of rendering it as HTML
 * content.
 *
 * @param {Mixed} value the value to escape
 */
var escapeContent = createEscapedStringifier(/[&<>]/gm, replaceContent);

function replaceAttribute(value) {
  return value.replace(ampRegex, '&amp;')
              .replace(ltRegex, '&lt;')
              .replace(gtRegex, '&gt;')
              .replace(quoteRegex, '&quot;')
              .replace(aposRegex, '&#39;');
}

function replaceContent(value) {
  return value.replace(ampRegex, '&amp;')
              .replace(ltRegex, '&lt;')
              .replace(gtRegex, '&gt;');
}

function createEscapedStringifier(escapeRegex, replaceFunction) {
  var escapeCacheMax = 1024 * 1024 * 8;  // 8 megabytes
  var escapeCacheSize = 0;
  var escapeCache = {};
  return escapedStringifier;

  // This is very similar to 'stringify' with the exception of 'string'
  function escapedStringifier(value) {
    switch ( typeof value ) {
      case 'string':
        // if it's cached, return it
        var result = escapeCache[value];
        if ( result ) {
          return result;
        }

        // maybe we need to flush the cache
        if ( escapeCacheSize >= escapeCacheMax ) {
          escapeCache = {};
          escapeCacheSize = 0;
        }

        // ok, guess we have to do some workgit 
        if ( escapeRegex.test(value) ) {
          result = escapeCache[value] = replaceFunction(value);
          escapeCacheSize += value.length + result.length;
        }
        else {
          result = escapeCache[value] = value;
          escapeCacheSize += value.length;
        }
        return result;

      case 'number':
        return '' + value;

      case 'boolean':
        return value ? 'true' : 'false';

      case 'function':
        return value.__intFunction ? value.toString() : '';

      case 'object':
        if ( isArray(value) ) {
          return stringifyArray(value, escapedStringifier);
        }
        return value === null ? '' : value.toString();
        
      default:
        return '';
    }
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
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value).length > 0;
  }
  return true;
}

/**
 * Checks whether or not the provided value is *falsy* by Interpol's
 * standards.
 *
 * @param {Mixed} value the value to test
 * @returns {boolean} if the value constitutes a *falsy* one
 */
function isFalsy(value) {
  if ( !value ) {
    return true;
  }
  if ( isArray(value) ) {
    return value.length === 0;
  }
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value).length === 0;
  }
  return false;
}

// Exported Functions
exports.isInterpolRuntime = isInterpolRuntime;
exports.isInterpolNodeModule = isInterpolNodeModule;
exports.isInterpolModule = isInterpolModule;
exports.isInterpolFunction = isInterpolFunction;
exports.isInterpolPartial = isInterpolPartial;
exports.stringify = stringify;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.bless = bless;
exports.isTruthy = isTruthy;
exports.isFalsy = isFalsy;
