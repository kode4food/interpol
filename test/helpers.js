/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

/**
 * Creates a mock console, primarily for intercepting the results of the
 * Interpol command-line tool
 */
function createConsole() {
  var buffer = [];
  var str;

  return {
    log: append,
    info: append,
    warn: append,
    error: append,
    result: result,
    contains: contains
  };

  function append(value) {
    buffer.push(value);
    str = null;
  }

  function result() {
    if ( !str ) {
      str = buffer.join('\n');
    }
    return str;
  }

  function contains(str) {
    return result().indexOf(str) !== -1;
  }
}

// Exported Functions
exports.createConsole = createConsole;
