/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../types');
var util = require('../util');

var stringify = types.stringify;
var escapeAttribute = types.escapeAttribute;
var escapeContent = types.escapeContent;

/**
 * Creates a StringWriter.  Interpol will create one by default if it is not
 * provided as an option to a compiled template.  A StringWriter manages the
 * writing of content as an underlying Array of Strings.  This Array is joined
 * and returned when the `done()` function is called.
 */
function createStringWriter() {
  var buffer = '';

  return {
    done: done,
    reset: reset,
    startElement: startElement,
    selfCloseElement: selfCloseElement,
    endElement: endElement,
    comment: comment,
    docType: docType,
    content: content,
    raw: raw
  };

  function done() {
    var result = buffer;
    buffer = '';
    return result;
  }

  function reset() {
    buffer = '';
  }

  function writeAttributes(attributes) {
    for ( var key in attributes ) {
      var val = attributes[key];
      if ( typeof val !== 'boolean' ) {
        buffer += " " + stringify(key) + "=\"" + escapeAttribute(val) + "\"";
        continue;
      }
      if ( val ) {
        buffer += " " + stringify(key);
      }
    }
  }

  function startElement(tagName, attributes) {
    buffer += "<" + stringify(tagName);
    writeAttributes(attributes);
    buffer += ">";
  }

  function selfCloseElement(tagName, attributes) {
    buffer += "<" + stringify(tagName);
    writeAttributes(attributes);
    buffer += " />";
  }

  function endElement(tagName) {
    buffer += "</" + stringify(tagName) + ">";
  }

  function comment(content) {
    buffer += "<!--" + content + "-->";
  }

  function docType(rootElement) {
    buffer += "<!DOCTYPE " + stringify(rootElement) + ">";
  }

  function content(value) {
    buffer += escapeContent(value);
  }

  function raw(value) {
    buffer += value;
  }
}

// Exported Functions
exports.createStringWriter = createStringWriter;
