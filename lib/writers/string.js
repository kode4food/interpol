/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');

var stringify = util.stringify;
var escapeAttribute = util.escapeAttribute;
var escapeContent = util.escapeContent;

function noOp() {}

/**
 * Creates a StringWriter.  Interpol will create one by default if it is not
 * provided as an option to a compiled template.  A StringWriter manages the
 * writing of content as an underlying Array of Strings.  This Array is joined
 * and returned when the `endRender()` function is called.
 */

function createStringWriter() {
  var arr = [];

  return {
    startRender: noOp,
    endRender: endRender,
    startElement: startElement,
    selfCloseElement: selfCloseElement,
    endElement: endElement,
    comment: comment,
    docType: docType,
    content: content,
    rawContent: rawContent
  };

  function endRender() {
    var result = arr.join('');
    arr.length = 0;
    return result;
  }

  function writeAttributes(attributes) {
    for ( var key in attributes ) {
      var val = attributes[key];
      if ( typeof val !== 'boolean' ) {
        arr.push(" ", stringify(key), "=\"",
                 escapeAttribute(stringify(val)), "\"");
        continue;
      }
      if ( val ) {
        arr.push(" ", stringify(key));
      }
    }
  }

  function startElement(tagName, attributes) {
    arr.push("<", stringify(tagName));
    writeAttributes(attributes);
    arr.push(">");
  }

  function selfCloseElement(tagName, attributes) {
    arr.push("<", stringify(tagName));
    writeAttributes(attributes);
    arr.push(" />");
  }

  function endElement(tagName) {
    arr.push("</", stringify(tagName), ">");
  }

  function comment(content) {
    arr.push("<!--", content, "-->");
  }

  function docType(rootElement) {
    arr.push("<!DOCTYPE ", stringify(rootElement), ">");
  }

  function content(content) {
    arr.push(escapeContent(stringify(content)));
  }

  function rawContent(content) {
    arr.push(stringify(content));
  }
}

function registerWriter(interpol) {
  interpol.createStringWriter = createStringWriter;
}

// Exported Functions
exports.createStringWriter = createStringWriter;
exports.registerWriter = registerWriter;