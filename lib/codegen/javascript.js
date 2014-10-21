/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');

var isArray = util.isArray;
var extendObject = util.extendObject;
var each = util.each;
var map = util.map;

var slice = Array.prototype.slice;

var jsonStringify = JSON.stringify;

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
    var id = generatedBuilders[funcId] = nextId('b', globals);
    globalVars.push(id + "=" + funcId + "()");
    return id;
  }

  function builderForLiteral(funcName, literalId) {
    var funcId = runtimeImport(funcName);
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
      return 'var ' + globalVars.join(',') + ';';
    }
    return '';
  }
}

function createModule(globals) {
  if ( globals === undefined ) {
    globals = createGlobals();
  }

  // Keeps track of name -> local mappings throughout the nesting
  var localStack = [];
  var locals = {};       // prefix -> nextId
  var names = {};        // name -> localId

  var writerStack = [];
  var body = [];

  return {
    getGlobals: getGlobals,
    localForName: localForName,
    local: local,
    self: self,
    writer: writer,
    write: write,
    getter: getter,
    binaryOperator: binaryOperator,
    conditionalOperator: conditionalOperator,
    statement: statement,
    ifStatement: ifStatement,
    func: func,
    subcontext: subcontext,
    call: call,
    array: array,
    object: object,
    code: code,
    toString: toString
  };

  function getGlobals() {
    return globals;
  }

  function nextId(prefix) {
    var next = locals[prefix];
    if ( typeof next !== 'number' ) {
      next = 0;  // seed it
    }
    var id = prefix + next;
    locals[prefix] = next + 1;
    return id;
  }

  function pushLocals() {
    localStack.push({
      locals: locals,
      names: names
    });
    locals = extendObject(locals);
    names = extendObject(names);
  }

  function popLocals() {
    var result = localStack.pop();
    locals = result.locals;
    names = result.names;
  }

  function localForName(name) {
    var id = names[name];
    if ( id ) {
      return id;
    }
    id = names[name] = nextId('v');
    return id;
  }

  function local() {
    return nextId('v');
  }

  function isLocalLookup(name) {
    return !!names[name];
  }

  function self() {
    write('c');
  }

  function writer(functionName) {
    if ( functionName === undefined ) {
      return 'w';
    }
    return 'w.' + functionName;
  }

  function pushWriter() {
    writerStack.push(body);
    body = [];
  }

  function popWriter() {
    var result = body;
    body = writerStack.pop();
    return code(result);
  }

  function write() {
    body.push.apply(body, arguments);
  }

  function getter(name) {
    if ( isLocalLookup(name) ) {
      write(localForName(name));
    }
    var getProperty = globals.runtimeImport('getProperty');
    write(getProperty, '(', self, ',', globals.literal(name), ')');
  }

  function binaryOperator(left, right, operator) {
    write('(', left, operator, right, ')');
  }

  function conditionalOperator(condition, trueVal, falseVal) {
    var isTruthy = globals.runtimeImport('isTruthy');
    write('(', isTruthy, '(', condition, ')?', trueVal, ':', falseVal, ')');
  }

  function statement(bodyCallback) {
    write(bodyCallback, ';');
  }

  function ifStatement(condition, thenBranch, elseBranch, not) {
    if ( typeof elseBranch === 'boolean' ) {
      not = elseBranch;
      elseBranch = null;
    }
    var condWrapper = globals.runtimeImport(not ? 'isFalsy' : 'isTruthy');
    var result = [];
    write('if(', condWrapper, '(');
    write(code(condition));
    write(')){');
    write(code(thenBranch));
    write('}');
    if ( elseBranch && elseBranch.length ) {
      write('else{');
      write(code(elseBranch));
      write('}');
    }
  }

  function func(internalArgs, contextArgs, bodyCallback) {
    if ( !isArray(contextArgs) ) {
      bodyCallback = contextArgs;
      contextArgs = [];
    }

    var argsId;
    var prologAssignments = [];
    var prologCode = [];
    var localNames = [];

    var handleNil = globals.runtimeImport('handleNil');

    each(contextArgs, function(argName, i) {
      var name = localNames[i] = localForName(argName);
      prologAssignment('name', handleNil + '(' + name + ')');
    });

    var argNames = internalArgs.concat(localNames);
    write('function(', argNames.join(','), '){');

    pushWriter();
    generateBody();
    var functionBody = popWriter();

    // Write out the prolog, if any
    if ( prologAssignments.length ) {
      write('var ', prologAssignments.join(','), ';');
    }
    each(prologCode, write);

    subcontext(function () {
      contextArgs.each(function (argName, i) {
        var name = localNames[i];
        var nameLit = globals.literal(argName);
        write(self, '[', nameLit, ']=', name, ';');
      });
      write(functionBody);
    });

    write('}');

    return; // done

    function generateBody() {
      if ( typeof bodyCallback !== 'function' ) {
        write(bodyCallback);
        return;
      }
      pushLocals();
      bodyCallback({
        getArgumentsId: getArgumentsId,
        prologAssignment: prologAssignment,
        prolog: prolog
      });
      popLocals();
    }

    function getArgumentsId() {
      if ( argsId ) {
        return argsId;
      }
      argsId = nextId('a');
      prologAssignment(argsId, 'arguments');
      return argsId;
    }

    function prologAssignment(name, value) {
      prologAssignments.push(name + '=' + value);
    }

    function prolog(callback) {
      prologCode.push(callback);
    }
  }

  function subcontext(bodyCallback) {
    var extendObject = globals.runtimeImport('extendObject');
    write('(');
    func([self], bodyCallback);
    write(')(', extendObject, '(', self, '))');
  }

  function call(funcId, args) {
    write(funcId, '(', map(args, code).join(','), ')');
  }

  function array(items) {
    write('[', map(items, code).join(','), ']');
  }

  function object(items) {
    var args = map(items, function (item) {
      return code(item[0]) + ':' + code(item[1]);
    })
    write('{', result.join(','), '}');
  }

  function code(value) {
    if ( value === undefined ) {
      return code(body);
    }

    if ( typeof value === 'function' ) {
      pushWriter();
      value();
      return popWriter();
    }

    if ( isArray(value) ) {
      return map(value, code).join('');
    }

    return value;
  }

  function toString() {
    return code();
  }
}

// Exported Functions
exports.createGlobals = createGlobals;
exports.createModule = createModule;
