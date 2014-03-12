/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , array = require('./array')
  , util = require('../util');

var createArrayWriter = array.createArrayWriter
  , freezeObject = util.freezeObject
  , mixin = util.mixin;

function createDOMWriter(parentElement, append) {
  var arr = []
    , writer = createArrayWriter(arr);

  return freezeObject(mixin({}, writer, {
    startRender: startRender,
    endRender: endRender
  }));

  function startRender() {
    arr.length = 0;
  }

  function endRender() {
    var content = arr.join('');
    arr.length = 0;
    if ( append ) {
      var container = document.createElement("span");
      container.innerHTML = content;
      parentElement.appendChild(container);
    }
    else {
      parentElement.innerHTML = content;
    }
  }
}

// Exports
exports.createDOMWriter = createDOMWriter;
interpol.createDOMWriter = createDOMWriter;
