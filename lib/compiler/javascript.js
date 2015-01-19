/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');
var types = require('../types');
var annotations = require('./annotations');

var isArray = util.isArray;
var extendObject = util.extendObject;
var mixin = util.mixin;
var objectKeys = util.objectKeys;
var each = util.each;
var map = util.map;
var filter = util.filter;
var annotate = annotations.annotate;
var hasAnnotation = annotations.hasAnnotation;

var jsonStringify = JSON.stringify;
var slice = Array.prototype.slice;

// presented operators are symbolic
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
  'neg': '-',
  'pos': '+'
};

// globals can either be generated per template function or can be shared
// amongst several template functions (for bundles)
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
    id = generatedLiterals[canonical] = nextId('l');

    globalVars.push(id + "=" + canonical);
    return id;
  }

  function runtimeImport(funcName) {
    var id = generatedImports[funcName];
    if ( id ) {
      return id;
    }
    id = generatedImports[funcName] = nextId('i');
    globalVars.push([id, "=r.", funcName].join(''));
    return id;
  }

  function builder(funcName) {
    var funcId = runtimeImport(funcName);
    var literalIds = slice.call(arguments, 1);

    var key = funcId + "/" + literalIds.join('/');
    var id = generatedBuilders[key];
    if ( id ) {
      return id;
    }
    id = generatedBuilders[key] = nextId('b');
    globalVars.push(id + "=" + funcId + "(" + literalIds.join(',') + ")");
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
  var selfName = 'c';

  var writerStack = [];
  var body = [];

  return {
    localForName: localForName,
    anonymous: anonymous,
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
    loopExpression: loopExpression,
    func: func,
    subcontext: subcontext,
    compoundExpression: compoundExpression,
    returnStatement: returnStatement,
    call: call,
    vector: vector,
    vectorAppend: vectorAppend,
    dictionary: dictionary,
    dictionarySet: dictionarySet,
    code: code,
    toString: toString
  };

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
    nameStack.push({ names: names, scopeInfo: scopeInfo, selfName: selfName });
    names = extendObject(names);
    scopeInfo = createScopeInfo();
  }

  function popLocalScope() {
    var info = nameStack.pop();
    names = info.names;
    scopeInfo = info.scopeInfo;
    selfName = info.selfName;
  }

  function localForName(name, forAssignment) {
    var willMutate = hasAnnotation(scopeInfo, 'mutations', name);

    var id = names[name];
    if ( id && (names.hasOwnProperty(name) || !willMutate) ) {
      return id;
    }

    var inCondition = !!scopeInfo.conditionDepth;
    scopeInfo.assignedEarly[name] = forAssignment && !inCondition;
    id = names[name] = nextId('v');
    return id;
  }

  function self(propertyName) {
    if ( propertyName === undefined ) {
      write(selfName);
      return;
    }
    write(selfName, '[', globals.literal(propertyName), ']');
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
    write(names[name], '=', value);
  }

  function isAnonymous(name) {
    return (/ h[0-9]+/).test(name);
  }

  function useContext() {
    return hasAnnotation(scopeInfo, 'self', 'read');
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

  function captureState(capturedBody) {
    var myScopeInfo = scopeInfo.snapshot();
    var myNames = names;
    var mySelfName = selfName;

    return function () {
      pushLocalScope();
      scopeInfo = myScopeInfo;
      names = myNames;
      selfName = mySelfName;
      capturedBody();
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

  function generate(value) {
    if ( typeof value !== 'function' ) {
      write(value);
      return;
    }
    value();
  }

  function getter(name) {
    write(localForName(name));
  }

  function contextAssignments(names) {
    each(names, function (name) {
      var localName = localForName(name);
      self(name);
      write('=', localName, ';');
    });
  }

  function assignments(items) {
    each(items, function (item) {
      var name = item[0];
      var value = item[1];

      // Evaluate this first
      var localName = localForName(name, true);
      write(localName, '=');
      if ( !isAnonymous(name) && useContext() ) {
        self(name);
        write('=');
      }
      write(value, ';');
    });
  }

  function unaryOperator(operator, operand) {
    write('(', operatorMap[operator], '(', code(operand), '))');
  }

  function binaryOperator(operator, left, right) {
    write('(', code(left), operatorMap[operator], code(right), ')');
  }

  function conditionalOperator(condition, trueVal, falseVal) {
    var isTruthy = globals.runtimeImport('isTruthy');
    var condCode = code(condition);
    var trueCode = code(trueVal);
    var falseCode = code(falseVal);
    write('(', isTruthy, '(', condCode, ')?', trueCode, ':', falseCode, ')');
  }

  function statement(bodyCallback) {
    write(code(bodyCallback), ';');
  }
  
  function ifStatement(condition, thenBranch, elseBranch) {
    var condWrapperName = 'isTruthy';
    if ( !thenBranch ) {
      condWrapperName = 'isFalsy';
      thenBranch = elseBranch;
      elseBranch = null;
    }
    scopeInfo.conditionDepth += 1;
    var condWrapper = globals.runtimeImport(condWrapperName);
    var condCode = code(condition);
    var thenCode = code(thenBranch);
    write('if(', condWrapper, '(', condCode, ')){', thenCode, '}');
    if ( elseBranch ) {
      write('else{', code(elseBranch), '}');
    }
    scopeInfo.conditionDepth -= 1;
  }

  function loopExpression(itemName, collection, loopGuard,
                          loopBody, annotations) {
    var loop = globals.runtimeImport('loop');
    annotate(annotations, 'javascript', 'bypassCleanse');

    call(loop, [
      collection,
      function () {
        func([], [itemName], loopGuard, loopBody, annotations);
      }
    ]);
  }

  function func(internalArgs, contextArgs, funcProlog, funcBody, annotations) {
    if ( !isArray(contextArgs) ) {
      annotations = funcBody;
      funcBody = funcProlog;
      funcProlog = contextArgs;
      contextArgs = [];
    }

    if ( typeof funcBody !== 'function' ) {
      annotations = funcBody;
      funcBody = funcProlog;
      funcProlog = null;
    }

    var parentNames = names;
    pushLocalScope();
    scopeInfo.annotations = annotations;
    var sub = contextArgs.length && useContext();
    var cleanse = !hasAnnotation(annotations, 'javascript', 'bypassCleanse');

    var localNames = map(contextArgs, localForName);

    var bodyContent = code(function () {
      if ( !sub ) {
        generate(funcBody);
        return;
      }

      statement(function () {
        subcontext(
          function () {
            contextAssignments(contextArgs);
            generate(funcBody);
          },
          annotations
        );
      });
    });

    var prologContent = code(function () {
      generate(funcProlog);
    });

    var argNames = internalArgs.concat(localNames);
    write('function(', argNames.join(','), '){');

    if ( contextArgs.length && cleanse ) {
      var cleanseArguments = globals.runtimeImport('cleanseArguments');
      write(cleanseArguments, '(arguments, ', internalArgs.length, ');');
    }

    write(prologContent);
    writeLocalVariables(parentNames, argNames);

    write(bodyContent, '}');
    popLocalScope();
  }

  function writeLocalVariables(parentNames, argNames) {
    if ( argNames === undefined ) {
      argNames = [];
    }

    var undefinedVars = [];
    each(objectKeys(names), function (name) {
      var localName = names[name];
      if ( argNames.indexOf(localName) !== -1 ) {
        // was an argument, skip it
        return;
      }

      if ( isAnonymous(name) || scopeInfo.assignedEarly[name] ) {
        undefinedVars.push(localName);
      }
      else if ( parentNames[name] ) {
        // Local Assignments (inherit from parent)
        write('var ', localName, '=', parentNames[name], ';');
      }
      else {
        var getProperty = globals.runtimeImport('getProperty');
        write('var ', localName, '=');
        call(getProperty, [
          self,
          globals.literal(name)
        ]);
        write(';');
      }
    });

    if ( undefinedVars.length ) {
      write('var ', undefinedVars.join(','), ';');
    }
  }

  function subcontext(bodyCallback, annotations) {
    var parentNames = names;
    var parentSelfName = selfName;

    pushLocalScope();
    scopeInfo.annotations = annotations;
    selfName = nextId('c');

    var extendObject = globals.runtimeImport('extendObject');
    statement(function () {
      write('var ', selfName, '=');
      call(extendObject, [parentSelfName]);
    });

    var bodyContent = code(function () {
      generate(bodyCallback);
    });

    writeLocalVariables(parentNames);
    write(bodyContent);
    popLocalScope();
  }

  function compoundExpression(expressions) {
    write('(');
    writeDelimited(expressions);
    write(')');
  }
  
  function returnStatement(bodyCallback) {
    if ( bodyCallback === undefined ) {
      write('return;');
      return;
    }
    write('return ', bodyCallback, ';');
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

  function vector(items) {
    write('[');
    writeDelimited(items);
    write(']');
  }

  function vectorAppend(vector, value) {
    statement(function () {
      write(vector, '.push(', value, ')');
    });
  }

  function dictionary(items, ordered) {
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
      var dictVar = anonymous();
      var components = [];      

      components.push(function () {
        anonymous(dictVar, writeLiterals);
      });

      each(expressions, function (item) {
        components.push(function () {
          var name = item[2] ? item[0] : globals.literal(item[0]);
          write(dictVar, '[', name, ']=', item[1]);          
        });
      });
      
      components.push(function () {
        anonymous(dictVar);
      });
      
      compoundExpression(components);
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

  function dictionarySet(dict, name, value) {
    statement(function () {
      write(dict, '[', name, ']=', value);
    });
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
