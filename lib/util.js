/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

// ## Array and Object Handling

var toString = Object.prototype.toString;
var slice = Array.prototype.slice;

var isArray = Array.isArray;
/* istanbul ignore if */
if ( !isArray ) {
  isArray = function _isArray(obj) {
    return obj && toString.call(obj) === '[object Array]';
  };
}

var objectKeys = Object.keys;
/* istanbul ignore if */
if ( !objectKeys ) {
  objectKeys = function _objectKeys(obj) {
    var keys = [];
    for ( var key in obj ) {
      if ( obj.hasOwnProperty(key) ) {
        keys.push(key);
      }
    }
    return keys;
  };
}

var extendObject;
(function () {
  function FakeConstructor() {}
  var testProto = { __proto__: { works: true } };

  /* istanbul ignore else */
  if ( testProto.works && objectKeys(testProto).length === 0 ) {
    extendObject = function _fastExtendObject(obj) {
      return { __proto__: obj };
    };
  }
  else if ( Object.create ) {
    extendObject = Object.create;
  }
  else {
    extendObject = function _slowExtendObject(obj) {
      FakeConstructor.prototype = obj;
      return new FakeConstructor();
    };
  }
})();

function mixin(target) {
  for ( var i = 1, ilen = arguments.length; i < ilen; i++ ) {
    var src = arguments[i];
    if ( typeof src !== 'object' || src === null || isArray(src) ) {
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
 * Checks whether or not the provided value is an Interpol pre-compiled JSON
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

// ## String Handling

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

  var unexpected = err.found ? "'" + err.found + "'" : "end of file";
  var errString = "Unexpected " + unexpected;
  var lineInfo = ":" + err.line + ":" + err.column;

  return new Error((filePath || 'string') + lineInfo + ": " + errString);
}

function formatWarning(warning, filePath) {
  var lineInfo = ":" + warning.line + ":" + warning.column;
  var warningString = warning.message;

  filePath = filePath || warning.filePath || 'string';
  return filePath + lineInfo + ": " + warningString;
}

// ## Function Invocation

/**
 * Returns whether or not a Function is 'blessed' as Interpol-compatible.
 *
 * @param {Function} func the Function to check
 */
function isInterpolFunction(func) {
  return typeof func === 'function' && func.__intFunction;
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

/**
 * Returns a 'configured' version of the provided function.  By configured,
 * this means that the wrapper can provide default values for any arguments
 * that aren't required.
 *
 * @param {Function} func the Function to configure
 * @param {Number} requiredCount the number of arguments that are required
 * @param {Array} defaultArgs default values for the rest of the arguments
 */

function configure(func, requiredCount, defaultArgs) {
  var argTemplate = new Array(requiredCount).concat(defaultArgs);
  return configuredWrapper;

  function configuredWrapper() {
    /* jshint validthis:true */
    var args = slice.call(arguments, 0);
    var applyArgs = args.concat(argTemplate.slice(args.length));
    return func.apply(this, applyArgs);
  }
}

var each;
if ( Array.prototype.forEach ) {
  each = (function () {
    var forEachMethod = Array.prototype.forEach;
    return function _each(arr, callback) {
      return forEachMethod.call(arr, callback);
    };
  })();
}
else {
  each = function _each(arr, callback) {
    for ( var i = 0, len = arr.length; i < len; i++ ) {
      callback(arr[i], i);
    }
  };
}

var map;
if ( Array.prototype.map ) {
  map = (function () {
    var mapMethod = Array.prototype.map;
    return function _map(arr, callback) {
      return mapMethod.call(arr, callback);
    };
  })();
}
else {
  map = function _map(arr, callback) {
    var result = [];
    each(arr, function (item) {
      result[i] = callback(item);
    });
    return result;
  };
}

var filter;
if ( Array.prototype.filter ) {
  filter = (function () {
    var filterMethod = Array.prototype.filter;
    return function _filter(arr, callback) {
      return filterMethod.call(arr, callback);
    };
  })();
}
else {
  filter = function _filter(arr, callback) {
    var result = [];
    each(arr, function (item) {
      if ( !callback(item) ) {
        result.push(item);
      }
    });
    return result;
  };
}

function selfMap(arr, callback) {
  each(arr, function (item, i) {
    arr[i] = callback(item);
  });
  return arr;
}

// Exported Functions
exports.isArray = isArray;
exports.extendObject = extendObject;
exports.objectKeys = objectKeys;
exports.mixin = mixin;
exports.isInterpolJSON = isInterpolJSON;
exports.isTruthy = isTruthy;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.formatSyntaxError = formatSyntaxError;
exports.formatWarning = formatWarning;
exports.isInterpolFunction = isInterpolFunction;
exports.bless = bless;
exports.configure = configure;
exports.each = each;
exports.map = map;
exports.filter = filter;
exports.selfMap = selfMap;