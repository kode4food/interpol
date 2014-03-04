/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../util');

var freezeObject = util.freezeObject
  , escapeAttribute = util.escapeAttribute
  , escapeContent = util.escapeContent;

function createArrayWriter(arr) {
  return freezeObject({
    startElement: startElement,
    selfCloseElement: selfCloseElement,
    endElement: endElement,
    comment: comment,
    content: content,
    rawContent: rawContent
  });

  function writeAttributes(attributes) {
    for ( var key in attributes ) {
      arr.push(" ", key, "=\"", escapeAttribute(attributes[key]), "\"");
    }
  }

  function startElement(tagName, attributes) {
    arr.push("<", tagName);
    writeAttributes(attributes);
    arr.push(">");
  }

  function selfCloseElement(tagName, attributes) {
    arr.push("<", tagName);
    writeAttributes(attributes);
    arr.push(" />");
  }

  function endElement(tagName) {
    arr.push("</", tagName, ">");
  }

  function comment(content) {
    arr.push("<!--", content, "-->");
  }

  function content() {
    for ( var i = 0, len = arguments.length; i < len; i++ ) {
      arr.push(escapeContent(arguments[i]));
    }
  }

  function rawContent() {
    arr.push.apply(arr, arguments);
  }
}

// Exports
exports.createArrayWriter = createArrayWriter;
