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

var operatorMap = {
  'eq':  '===',
  'neq': '!==',
  'gt':  '>',
  'lt':  '<',
  'ge':  '>=',
  'le':  '<=',
  'add': '+',
  'sub': '-',
  'mul': '*',
  'div': '/',
  'mod': '%',
  'not': '!',
  'neg': '-'
}

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
    anonymous: anonymous,
    resetLocals: resetLocals,
    self: self,
    writer: writer,
    write: write,
    getter: getter,
    assignments: assignments,
    unaryOperator: unaryOperator,
    binaryOperator: binaryOperator,
    conditionalOperator: conditionalOperator,
    statement: statement,
    ifStatement: ifStatement,
    func: func,
    subcontext: subcontext,
    call: call,
    "return": returnValue,
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

  function anonymous() {
    var id = nextId('h');
    var name = ' ' + id;  // space allows anonymous locals
    names[name] = id;
    return name;
  }

  function isAnonymous(name) {
    return / h[0-9]+/.test(name);
  }

  function isLocalLookup(name) {
    return !!names[name];
  }

  function resetLocals() {
    locals = {};
    names = {};
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

  function writeDelimited(items, delimiter) {
    if ( delimiter === undefined ) {
      delimiter = ',';
    }
    each(items, function (item, i) {
      if ( i > 0 ) {
        write(delimiter);
      }
      write(item);
    });
  }

  function getter(name) {
    if ( isLocalLookup(name) ) {
      write(localForName(name));
      return;
    }
    var getProperty = globals.runtimeImport('getProperty');
    write(getProperty, '(', self, ',', globals.literal(name), ')');
  }

  function assignments(items) {
    if ( !items.length ) {
      return;
    }

    write('var ');
    each(items, function (item, i) {
      if ( i > 0 ) {
        write(',');
      }
      var name = item[0];
      var value = item[1];
      var localName = localForName(name);
      write(localName, '=');
      if ( !isAnonymous(name) ) {
        write(self, '[', globals.literal(name), ']=');
      }
      write(value);
    });
    write(';');
  }

  function unaryOperator(operand, operator) {
    write('(', operatorMap[operator], '(', operand, '))');
  }

  function binaryOperator(left, right, operator) {
    write('(', left, operatorMap[operator], right, ')');
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

    each(contextArgs, function (argName, i) {
      var name = localNames[i] = localForName(argName);
      prologAssignment('name', handleNil + '(' + name + ')');
    });

    var argNames = internalArgs.concat(localNames);
    write('function(', argNames.join(','), '){');

    pushWriter();
    generateBody();
    var functionBody = popWriter();

    // Write out the prolog, if any
    assignments(prologAssignments);
    each(prologCode, write);

    subcontext(function () {
      each(contextArgs, function (argName, i) {
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
      prologAssignments.push([name, value]);
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
    write(funcId, '(');
    writeDelimited(args);
    write(')');
  }

  function returnValue(bodyCallback) {
    if ( bodyCallback === undefined ) {
      write('return;');
      return;
    }
    write('return ', bodyCallback, ';');
  }

  function array(items) {
    write('[');
    writeDelimited(items);
    write(']');
  }

  function object(items) {
    var literals = [];
    var expressions = [];

    each(items, function (item) {
      var target = typeof item[0] === 'function' ? expressions : literals;
      target.push(item);
    });

    if ( expressions.length ) {
      write('(function(o){');
      each(expressions, function (item) {
        write('o[', item[0], ']=', item[1], ';');
      });
      write('})(');
      writeLiterals();
      write(')');
    }
    else {
      writeLiterals();
    }

    function writeLiterals() {
      write('{');
      each(literals, function (item, i) {
        if ( i > 0 ) {
          write(',');
        }
        write(jsonStringify(item[0]), ':', item[1]);
      });
      write('}');
    }
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
