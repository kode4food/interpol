/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

// ## Array and Object Handling

var toString = Object.prototype.toString
  , slice = Array.prototype.slice;

var isArray = Array.isArray;
if ( !isArray ) {
  isArray = (function () {
    return function _isArray(obj) {
      return obj && obj.length && toString.call(obj) === '[object Array]';
    };
  })();
}

var extendContext = Object.create;
if ( !extendContext ) {
  extendContext = (function () {
    function FakeConstructor() {}

    return function _extendContext(obj) {
      FakeConstructor.prototype = obj;
      return new FakeConstructor();
    };
  })();
}

var freezeObject = Object.freeze;
if ( !freezeObject ) {
  freezeObject = (function () {
    return function _freezeObject(obj) {
      return obj;
    };
  })();
}

var objectKeys = Object.keys;
if ( !objectKeys ) {
  objectKeys = (function () {
    return function _objectKeys(obj) {
      var keys = [];
      for ( var key in obj ) {
        if ( obj.hasOwnProperty(key) ) {
          keys.push(key);
        }
      }
      return keys;
    };
  });
}

function mixin(target) {
  for ( var i = 1, ilen = arguments.length; i < ilen; i++ ) {
    var src = arguments[i];
    if ( !src || typeof src !== 'object') {
      continue;
    }
    var keys = objectKeys(src);
    for ( var j = keys.length - 1; j >= 0; j-- ) {
      var key = keys[j];
      target[key] = src[key];
    }
  }
  return target;
}

/**
 * Creates a closure whose job it is to mix the configured Object's
 * properties into a target provided to the closure.
 *
 * @param {Object} obj the Object to copy (will be frozen)
 */

function createStaticMixin(obj) {
  var keys = objectKeys(freezeObject(obj)).reverse()
    , klen = keys.length - 1;

  return staticMixin;

  function staticMixin(target) {
    for ( var i = klen; i >= 0; i-- ) {
      var key = keys[i];
      target[key] = obj[key];
    }
    return target;
  }
}

/**
 * Checks whether or not the provided value is an Interpol Pre-Parsed JSON
 * Object.
 *
 * @param {Object} value an Object to be checked
 */

function isInterpolJSON(value) {
  return typeof value === 'object' &&
    value !== null &&
    value.i === 'interpol' &&
    typeof value.v === 'string' &&
    !isArray(value) &&
    isArray(value.l) &&
    isArray(value.n);
}

// ## String Handling

var EscapeChars = freezeObject({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
});

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

    case 'xml':
      return value.toXMLString();

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

// ## Exceptions

/**
 * Intercepts a PEG.js Exception and generate a human-readable error message.
 *
 * @param {Exception} err the Exception that was raised
 * @param {String} [filePath] path to the file that was being parsed
 */

function formatSyntaxError(err, filePath) {
  if ( !err.name || err.name !== 'SyntaxError') {
    return err;
  }

  var unexpected = err.found ? "'" + err.found + "'" : "end of file"
    , errString = "Unexpected " + unexpected
    , lineInfo = ":" + err.line + ":" + err.column;

  return new Error((filePath || 'string') + lineInfo + ": " + errString);
}

// ## Function Invocation

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

  if ( func.__interpolFunction ) {
    return func;
  }

  blessedWrapper.__interpolFunction = true;
  return blessedWrapper;

  function blessedWrapper() {
    /* jshint validthis:true */
    return func.apply(this, arguments);
  }
}

/**
 * Returns a 'configured' version of the provided function.  By configured,
 * this means that the wrapper will provide default values for any arguments
 * that aren't required.
 *
 * @param {Function} func the Function to configure
 * @param {Number} requiredCount the number of arguments that are required
 * @param {Array} defaultArgs default values for the rest of the arguments
 */

function configure(func, requiredCount, defaultArgs) {
  var required = [];
  required.length = requiredCount;
  var argTemplate = required.concat(defaultArgs);
  return configuredWrapper;

  function configuredWrapper() {
    /* jshint validthis:true */
    var args = slice.call(arguments, 0)
      , applyArgs = args.concat(argTemplate.slice(args.length));
    return func.apply(this, applyArgs);
  }
}

// Exported Functions
exports.isArray = isArray;
exports.extendContext = extendContext;
exports.freezeObject = freezeObject;
exports.objectKeys = objectKeys;
exports.mixin = mixin;
exports.createStaticMixin = createStaticMixin;
exports.isInterpolJSON = isInterpolJSON;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.formatSyntaxError = formatSyntaxError;
exports.bless = bless;
exports.configure = configure;
