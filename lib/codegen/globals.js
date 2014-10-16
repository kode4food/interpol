/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var jsonStringify = JSON.stringify;

var util = require('../util');

function createGlobals() {
  var globals = {};            // prefix -> nextId
  var generatedLiterals = {};  // literal -> globalId
  var generatedImports = {};   // funcName -> globalId
  var generatedBuilders = {};  // funcNameId,literalId -> globalId
  var globalVars = [];

  return {
    nextId: nextId,
    literal: literal,
    runtimeImport: runtimeImport,
    builder: builder,
    builderForLiteral: builderForLiteral,
    push: globalVars.push.bind(globalVars),
    toString: toString
  };

  function nextId(prefix) {
    var next = globals[prefix];
    if ( typeof next !== 'number' ) {
      next = 0;  // seed it
    }
    var id = prefix + next;
    globals[prefix] = next + 1;
    return id;
  }

  function literal(literalValue) {
    var canonical = jsonStringify(literalValue);
    var id = generatedLiterals[canonical];
    if ( id ) {
      return id;
    }
    id = generatedLiterals[canonical] = nextId('l', globals);
    globalVars.push(id + "=" + canonical);
    return id;
  }

  function runtimeImport(funcName) {
    var id = generatedImports[funcName];
    if ( id ) {
      return id;
    }
    id = generatedImports[funcName] = nextId('i', globals);
    globalVars.push([id, "=r.", funcName].join(''));
    return id;
  }

  function builder(funcName) {
    var funcId = runtimeImport(funcName);
    var id = generatedBuilders[key] = nextId('b', globals);
    globalVars.push(id + "=" + funcId + "()");
    return id;
  }

  function builderForLiteral(funcName, literalValue) {
    var funcId = runtimeImport(funcName);
    var literalId = literal(literalValue);
    var key = funcId + "/" + literalId;
    var id = generatedBuilders[key];
    if ( id ) {
      return id;
    }
    id = generatedBuilders[key] = nextId('b', globals);
    globalVars.push(id + "=" + funcId + "(" + literalId + ")");
    return id;
  }

  function toString() {
    if ( globalVars.length ) {
      return 'var ' + globalVars.join(',');
    }
    return '';
  }
}

// Exported Functions
exports.createGlobals = createGlobals;
