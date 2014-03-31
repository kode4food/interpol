/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

var freezeObject = util.freezeObject
  , escapeAttribute = util.escapeAttribute
  , escapeContent = util.escapeContent;

function noOp() {}

/**
 * Creates an Array Writer.  Interpol will create one by default if it is not
 * provided as an option to a compiled template.  An Array Writer manages the
 * writing of content as an Array of Strings.  This Array is joined and
 * returned when the `endRender()` function is called.
 *
 * @param {Array} [arr] The Array to manage, otherwise one is created
 */

function createArrayWriter(arr) {
  arr = arr || [];

  return freezeObject({
    startRender: noOp,
    endRender: endRender,
    startElement: startElement,
    selfCloseElement: selfCloseElement,
    endElement: endElement,
    comment: comment,
    docType: docType,
    content: content,
    rawContent: rawContent
  });

  function endRender() {
    return arr.join('');
  }

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

  function docType(rootElement) {
    arr.push("<!DOCTYPE ", rootElement, ">");
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
interpol.createArrayWriter = createArrayWriter;
