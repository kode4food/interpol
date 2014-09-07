/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');
var string = require('./string');

var freezeObject = util.freezeObject;
var mixin = util.mixin;
var createStringWriter = string.createStringWriter;

var REPLACE = createDOMWriter.REPLACE = 'replace';
var APPEND = createDOMWriter.APPEND = 'append';
var INSERT = createDOMWriter.INSERT = 'insert';

/**
 * Creates a DOMWriter.  A DOMWriter attaches itself to a DOM Element,
 * and will manipulate that Element's content when a template is rendered
 * with it.  The writer is very simple and won't cover all use-cases, it
 * also may not be the most performant approach.
 *
 * The default mode is REPLACE, meaning all of the Element's children are
 * replaced when the associated template is rendered.  INSERT and APPEND
 * will insert new renderings to the beginning or end of the child list
 * respectively.
 *
 * @param {Element} parentElement the Element to which this DOMWriter attaches
 * @param {String} [renderMode] the DOM rendering mode: REPLACE|APPEND|INSERT
 */

function createDOMWriter(parentElement, renderMode) {
  var arr = [];
  var writer = createStringWriter(arr);
  var writerEndRender = writer.endRender;
  var endRender;

  switch ( renderMode ) {
    case APPEND:  endRender = appendEndRender; break;
    case INSERT:  endRender = insertEndRender; break;
    // case REPLACE: endRender = replaceEndRender; break;
    default:      endRender = replaceEndRender;
  }

  return freezeObject(mixin({}, writer, {
    endRender: endRender
  }));

  function appendEndRender() {
    var container = document.createElement("span");
    container.innerHTML = writerEndRender();
    parentElement.appendChild(container);
  }

  function insertEndRender() {
    var container = document.createElement("span");
    container.innerHTML = writerEndRender();
    parentElement.insertBefore(container, parentElement.firstChild);
  }

  function replaceEndRender() {
    parentElement.innerHTML = writerEndRender();
  }
}

function registerWriter(interpol) {
  interpol.createDOMWriter = createDOMWriter;
}

// Exported Functions
exports.createDOMWriter = createDOMWriter;
exports.registerWriter = registerWriter;
