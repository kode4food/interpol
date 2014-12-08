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
/* istanbul ignore next: browser-only */
function createDOMWriter(parentElement, renderMode) {
  var writer = createStringWriter();
  var writerDone = writer.done;
  var done;

  switch ( renderMode ) {
    case APPEND: done = appendEndRender; break;
    case INSERT: done = insertEndRender; break;
    default:     done = replaceEndRender;
  }

  return mixin({}, writer, {
    done: done
  });

  function appendEndRender() {
    var container = document.createElement("span");
    container.innerHTML = writerDone();
    parentElement.appendChild(container);
  }

  function insertEndRender() {
    var container = document.createElement("span");
    container.innerHTML = writerDone();
    parentElement.insertBefore(container, parentElement.firstChild);
  }

  function replaceEndRender() {
    parentElement.innerHTML = writerDone();
  }
}

// Exported Functions
exports.createDOMWriter = createDOMWriter;
