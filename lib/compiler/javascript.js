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
var mixin = util.mixin;
var objectKeys = util.objectKeys;
var each = util.each;
var map = util.map;
var filter = util.filter;

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
};

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
  var locals = {};       // prefix -> nextId
  var names = {};        // name -> localId
  var scopeInfo = createScopeInfo();
  var nameStack = [];

  var writerStack = [];
  var body = [];

  return {
    getGlobals: getGlobals,
    localForName: localForName,
    anonymous: anonymous,
    resetLocals: resetLocalNames,
    self: self,
    writer: writer,
    write: write,
    getter: getter,
    contextAssignments: contextAssignments,
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

  function createScopeInfo() {
    return {
      conditionDepth: 0,
      assignedEarly: {},
      snapshot: function () {
        return mixin({}, this);
      }
    };
  }

  function pushLocalScope() {
    nameStack.push({ names: names, scopeInfo: scopeInfo });
    names = extendObject(names);
    scopeInfo = createScopeInfo();
  }

  function popLocalScope() {
    var info = nameStack.pop();
    names = info.names;
    scopeInfo = info.scopeInfo;
  }

  function localForName(name, forAssignment) {
    var id = names[name];
    if ( id && (!forAssignment || names.hasOwnProperty(name)) ) {
      // it's not for assignment or has been assigned locally already
      return id;
    }
    var inCondition = !!scopeInfo.conditionDepth;
    scopeInfo.assignedEarly[name] = forAssignment && !inCondition;
    id = names[name] = nextId('v');
    return id;
  }

  function anonymous(name, value) {
    if ( name === undefined ) {
      var id = nextId('h');
      name = ' ' + id;  // space allows anonymous locals
      names[name] = id;
      return name;
    }
    if ( value === undefined ) {
      write(names[name]);
      return;
    }
    write(names[name], '=', value, ';');
  }

  function isAnonymous(name) {
    return (/ h[0-9]+/).test(name);
  }

  function isLocalInScope(name) {
    return !!names[name];
  }

  function resetLocalNames() {
    names = {};
    scopeInfo = createScopeInfo();
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

  function captureState(func) {
    var myScopeInfo = scopeInfo.snapshot();
    var myNames = names;

    return function () {
      pushLocalScope();
      scopeInfo = myScopeInfo;
      names = myNames;
      func();
      popLocalScope();
    };
  }

  function write() {
    var args = filter(arguments, function (arg) {
      return arg !== undefined && arg !== null;
    });
    each(args, function (arg) {
      if ( typeof arg === 'function' ) {
        body.push(captureState(arg));
      }
      else {
        body.push(arg);
      }
    });
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
    if ( isLocalInScope(name) ) {
      write(localForName(name));
      return;
    }
    var getProperty = globals.runtimeImport('getProperty');
    write(getProperty, '(', self, ',', globals.literal(name), ')');
  }

  function contextAssignments(names) {
    each(names, function (name) {
      var localName = localForName(name);
      write(self, '[', globals.literal(name), ']=', localName, ';');
    });
  }

  function assignments(items) {
    if ( !items.length ) {
      return;
    }

    each(items, function (item) {
      var name = item[0];
      var value = item[1];
      var localName = localForName(name, true);
      write(localName, '=');
      if ( !isAnonymous(name) ) {
        write(self, '[', globals.literal(name), ']=');
      }
      write(value, ';');
    });
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

  function ifStatement(condition, thenBranch, elseBranch) {
    var condWrapperName = 'isTruthy';
    if ( !thenBranch ) {
      condWrapperName = 'isFalsy';
      thenBranch = elseBranch;
      elseBranch = null;
    }
    if ( !thenBranch && !elseBranch ) {
      return;
    }
    scopeInfo.conditionDepth += 1;
    var condWrapper = globals.runtimeImport(condWrapperName);
    write('if(', condWrapper, '(', condition, ')){', thenBranch, '}');
    if ( elseBranch ) {
      write('else{', elseBranch, '}');
    }
    scopeInfo.conditionDepth -= 1;
  }

  function func(internalArgs, contextArgs, funcProlog, funcBody) {
    var sub = true;
    if ( !isArray(contextArgs) ) {
      funcBody = funcProlog;
      funcProlog = contextArgs;
      contextArgs = [];
      sub = false;
    }

    if ( typeof funcBody !== 'function' ) {
      funcBody = funcProlog;
      funcProlog = null;
    }

    var parentNames = names;
    pushLocalScope();

    var localNames = map(contextArgs, localForName);

    var bodyContent = code(function () {
      if ( !sub ) {
        generate(funcBody);
        return;
      }

      statement(function () {
        subcontext(function () {
          contextAssignments(contextArgs);
          generate(funcBody);
        });
      });
    });

    var prologContent = code(function () {
      generate(funcProlog);
    });

    var argNames = internalArgs.concat(localNames);
    write('function(', argNames.join(','), '){');
    each(localNames, function (localName) {
      var handleNil = globals.runtimeImport('handleNil');
      write(localName, '=', handleNil + '(' + localName + ');');
    });
    
    // Local Assignments (inherit from parent)
    each(objectKeys(names), function (name) {
      var localName = names[name];
      if ( localNames.indexOf(localName) !== -1 ) {
        // was an argument, skip it
        return;
      }
      write('var ', localName);
      if ( scopeInfo.assignedEarly[name] ) {
        write(';');
      }
      else if ( parentNames[name] ) {
        write('=', parentNames[name], ';');
      }
      else {
        var getProperty = globals.runtimeImport('getProperty');
        write('=')
        call(getProperty, [
          self,
          globals.literal(name)
        ]);
        write(';');
      }
    });

    write(prologContent, bodyContent, '}');
    popLocalScope();
    return;

    function generate(func) {
      if ( typeof func !== 'function' ) {
        write(func);
        return;
      }
      func();
    }
  }

  function subcontext(bodyCallback) {
    pushLocalScope();
    var funcCode = code(function () {
      func([code(self)], bodyCallback);
    });
    var extendCode = code(function () {
      var extendObject = globals.runtimeImport('extendObject');
      call(extendObject, [code(self)]);
    });
    call(function () {
      write('(', funcCode, ')');
    }, [extendCode]);
    popLocalScope();
  }

  function call(funcId, args) {
    if ( !args ) {
      // Pass through local arguments (for partial chaining)
      write(funcId, '.apply(null,arguments)');
      return;
    }
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

  function object(items, ordered) {
    items = map(items, function (item) {
      return item.concat(typeof item[0] === 'function');
    });

    var literals = [];
    var expressions = items;

    if ( !ordered ) {
      expressions = [];
      each(items, function (item) {
        var target = item[2] ? expressions : literals;
        target.push(item);
      });
    }

    if ( expressions.length ) {
      write('(function(o){');
      each(expressions, function (item) {
        var name = item[2] ? item[0] : globals.literal(item[0]);
        write('o[', name, ']=', item[1], ';');
      });
      write('return o;})(');
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
