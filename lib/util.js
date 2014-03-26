/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

// Array and Object Handling **************************************************

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

function mixin(target) {
  for ( var i = 1, len = arguments.length; i < len; i++ ) {
    var src = arguments[i];
    if ( !src ) {
      continue;
    }
    for ( var key in src ) {
      if ( !src.hasOwnProperty(key) ) {
        continue;
      }
      target[key] = src[key];
    }
  }
  return target;
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

function isInterpolJSON(value) {
  return typeof value === 'object' &&
    value !== null &&
    value.i === 'interpol' &&
    typeof value.v === 'string' &&
    !isArray(value) &&
    isArray(value.l) &&
    isArray(value.n);
}

// String Handling ************************************************************

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

// TODO: Need to better handle complex types like Dates
function stringify(obj) {
  var type = typeof obj;
  switch ( type ) {
    case 'string':
      return obj;

    case 'number':
      return obj.toString();

    case 'boolean':
      return obj ? 'true' : 'false';

    case 'xml':
      return obj.toXMLString();

    case 'object':
      if ( isArray(obj) ) {
        var result = [];
        for ( var i = 0, len = obj.length; i < len; i++ ) {
          result[i] = stringify(obj[i]);
        }
        return result.join(' ');
      }
      return obj !== null ? obj.toString() : '';

    default:
      // catches 'undefined'
      return '';
  }
}

// Exceptions *****************************************************************

function formatSyntaxError(err, filePath) {
  if ( !err.name || err.name !== 'SyntaxError') {
    return err;
  }

  var unexpected = err.found ? "'" + err.found + "'" : "end of file"
    , errString = "Unexpected " + unexpected
    , lineInfo = ":" + err.line + ":" + err.column;

  return new Error((filePath || 'string') + lineInfo + ": " + errString);
}

// Function Invocation ********************************************************

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

// Exports
exports.isArray = isArray;
exports.mixin = mixin;
exports.extendContext = extendContext;
exports.freezeObject = freezeObject;
exports.objectKeys = objectKeys;
exports.createStaticMixin = createStaticMixin;
exports.isInterpolJSON = isInterpolJSON;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.formatSyntaxError = formatSyntaxError;
exports.bless = bless;
exports.configure = configure;
