/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

// Array and Object Handling **************************************************

var toString = Object.prototype.toString;

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

// TODO: Need to handle complex types like Dates
function stringify(obj) {
  var type = typeof obj;
  switch ( type ) {
    case 'string':    return obj;
    case 'number':    return obj.toString();
    case 'boolean':   return obj ? 'true' : 'false';
    case 'undefined': return '';
    case 'object':    return obj !== null ? obj.toString() : '';
    case 'xml':       return obj.toXMLString();
    default:          return '';
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

// Exports
exports.isArray = isArray;
exports.mixin = mixin;
exports.extendContext = extendContext;
exports.freezeObject = freezeObject;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.formatSyntaxError = formatSyntaxError;
