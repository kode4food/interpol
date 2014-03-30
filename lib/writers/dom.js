/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util')
  , array = require('./array');

var freezeObject = util.freezeObject
  , mixin = util.mixin
  , createArrayWriter = array.createArrayWriter;

var REPLACE = createDOMWriter.REPLACE = 'replace'
  , APPEND = createDOMWriter.APPEND = 'append'
  , INSERT = createDOMWriter.INSERT = 'insert';

/**
 * Creates a DOM Writer.  A DOM Writer attaches itself to a DOM Element,
 * and will manipulate that Element's content when a template is rendered
 * with it.  The writer is very simple and won't cover all use-cases, it
 * also may not be the most performant approach.
 *
 * The default mode is REPLACE, meaning all of the Element's children are
 * replaced when the associated template is rendered.  INSERT and APPEND
 * will insert new renderings to the beginning or end of the child list
 * respectively.
 *
 * parentElement:Element - The Element to which this DOMWriter attaches
 * renderMode:String? - The DOM rendering mode (REPLACE|APPEND|INSERT)
 */
function createDOMWriter(parentElement, renderMode) {
  var arr = []
    , writer = createArrayWriter(arr)
    , endRender;

  switch ( renderMode ) {
    case APPEND:  endRender = appendEndRender; break;
    case INSERT:  endRender = insertEndRender; break;
    case REPLACE: endRender = replaceEndRender; break;
    default:      endRender = replaceEndRender;
  }

  return freezeObject(mixin({}, writer, {
    startRender: startRender,
    endRender: endRender
  }));

  function startRender() {
    // Just in case
    arr.length = 0;
  }

  function appendEndRender() {
    var container = document.createElement("span");
    container.innerHTML = arr.join('');
    arr.length = 0;
    parentElement.appendChild(container);
  }

  function insertEndRender() {
    var container = document.createElement("span");
    container.innerHTML = arr.join('');
    arr.length = 0;
    parentElement.insertBefore(container, parentElement.firstChild);
  }

  function replaceEndRender() {
    parentElement.innerHTML = arr.join('');
    arr.length = 0;
  }
}

// Exports
exports.createDOMWriter = createDOMWriter;
interpol.createDOMWriter = createDOMWriter;
