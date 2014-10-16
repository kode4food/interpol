/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var createGlobals = require('./globals').createGlobals;

var util = require('./../util');

var isArray = util.isArray;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;
var each = util.each;
var map = util.map;

var slice = Array.prototype.slice;

/**
 * Converts a parse tree to a JavaScript Function that can be pulled into
 * an Interpol Runtime instance
 *
 * @param {Object} parseTree the parse tree to use
 * @param {Mixed[]} literals A table of literal values
 * @param {Object} [options] Options used by Interpol or its CLI
 */

function generateTemplateBody(parseTree, literals, options) {
  options = options || {};
  var functionWrapper = options.functionWrapper || generateCode;
  var sharedGlobals = !!options.globals;
  var globals = options.globals || createGlobals();

  // A lookup table of code generators
  var Evaluators = {
    'im': createImportEvaluator,
    'de': createPartialEvaluator,
    'bi': createBindEvaluator,
    'ca': createCallEvaluator,
    'as': createAssignEvaluator,
    'op': createOpenTagEvaluator,
    'cl': createCloseTagEvaluator,
    'ct': createCommentTagEvaluator,
    'dt': createDocTypeEvaluator,
    'ou': createOutputEvaluator,
    'ra': createRawOutputEvaluator,
    'fr': createForEvaluator,
    'us': createUsingStmtEvaluator,
    'ux': createUsingExprEvaluator,
    'cn': createTernaryEvaluator,
    'if': createIfEvaluator,
    'or': createOrEvaluator,
    'an': createAndEvaluator,
    'eq': createEqEvaluator,
    'ma': createMatchEvaluator,
    'nq': createNeqEvaluator,
    'gt': createGtEvaluator,
    'lt': createLtEvaluator,
    'ge': createGteEvaluator,
    'le': createLteEvaluator,
    'ad': createAddEvaluator,
    'su': createSubEvaluator,
    'mu': createMulEvaluator,
    'di': createDivEvaluator,
    'mo': createModEvaluator,
    'fm': createFormatEvaluator,
    'no': createNotEvaluator,
    'ne': createNegEvaluator,
    'mb': createMemberEvaluator,
    'ar': createArrayEvaluator,
    'dc': createDictionaryEvaluator,
    'id': createIdEvaluator,
    'se': createSelfEvaluator
  };

  // Keeps track of name -> local mappings throughout the nesting
  var localStack = [];
  var locals = {};             // prefix -> nextId
  var names = {};              // name -> localId

  return functionWrapper(function () {
    var buffer = ['"use strict"'];

    var defineTemplate = globals.runtimeImport('defineTemplate');

    // createStatementsEvaluator will populate globalVars
    var body = createStatementsEvaluator(parseTree);

    if ( !sharedGlobals ) {
      buffer.push(globals.toString());
    }

    var define = ['return ', defineTemplate, '(',
      generateFunction(['c', 'w'], body),
      ')'];

    buffer.push(define.join(''));
    return buffer.join(';') + ';';
  });

  function nextId(prefix) {
    var next = locals[prefix];
    if ( typeof next !== 'number' ) {
      next = 0;  // seed it
    }
    var id = prefix + next;
    locals[prefix] = next + 1;
    return id;
  }

  function generateCode(value) {
    if ( typeof value === 'function' ) {
      return value();
    }
    return value;
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

  function generateLocalForName(name) {
    var id = names[name];
    if ( id ) {
      return id;
    }
    id = names[name] = nextId('v');
    return id;
  }

  function generateLocal() {
    return nextId('v');
  }

  function isLocalLookup(name) {
    return !!names[name];
  }

  function deferCreate(node, createFunc) {
    if ( !createFunc ) {
      createFunc = createEvaluator;
    }
    return function () {
      return node && createFunc(node);
    };
  }

  function generateGetter(name) {
    if ( typeof name === 'number' ) {
      name = literals[name];
    }
    if ( isLocalLookup(name) ) {
      return generateLocalForName(name);
    }
    return 'c[' + globals.literal(name) + ']';
  }

  function generateFunction(args, contextArgs, body) {
    if ( !isArray(contextArgs) ) {
      body = contextArgs;
      contextArgs = [];
    }
    pushLocals();
    var assigns = [];
    var localNames = [];

    each(contextArgs, function(argName, i) {
      var name = localNames[i] = generateLocalForName(argName);
      var nameLit = globals.literal(argName);
      assigns.push('c[' + nameLit + ']=' + name);
    });

    var result = [];
    result.push('function(' + (args.concat(localNames).join(',') + '){'));
    if ( assigns.length ) {
      result.push(assigns.join(';') + ';');
    }
    result.push(generateCode(body));
    result.push('}');
    popLocals();
    return result.join('');
  }

  function generateSubcontext(body) {
    var extendObject = globals.runtimeImport('extendObject');
    var func = generateFunction(['c'], body);
    return ['(', func, ')(', extendObject, '(c));'].join('');
  }

  function generateContextAssignment(name, value) {
    var lit = globals.literal(name);
    return ['c[', lit, ']=', generateCode(value)].join('');
  }

  function generateAssignment(name, value) {
    var id = generateLocalForName(name);
    var contextAssign = generateContextAssignment(name, value);
    return [id, '=' + contextAssign].join('');
  }

  function generateDeclaration(name, value) {
    return 'var ' + generateAssignment(name, value);
  }

  function generateIfStatement(condition, thenBranch, elseBranch) {
    var result = ['if('];
    result.push(generateCode(condition));
    result.push('){');
    result.push(generateCode(thenBranch));
    result.push('}');
    if ( elseBranch && elseBranch.length ) {
      result.push('else{');
      result.push(generateCode(elseBranch));
      result.push('}');
    }
    return result.join('');
  }

  // wrap evaluators for processing HTML attributes, including the attribute
  // names, since they can also be represented by expressions
  function wrapAttributeEvaluators(keyValueNodes) {
    /* istanbul ignore if */
    if ( !keyValueNodes ) {
      return [];
    }

    return map(keyValueNodes, function(keyValueNode) {
      return [createEvaluator(keyValueNode[0]),
              createEvaluator(keyValueNode[1])];
    });
  }

  /**
   * The busiest function in the code generator.  createEvaluator
   * resolves the evaluator generation function to use by taking the
   * first element of the node array.  It then passes the rest of the
   * node's elements as arguments to that generation function.
   *
   * @param {Array|Number} node Either an Array or a Literal Id
   */

  function createEvaluator(node) {
    if ( !isArray(node) ) {
      /* istanbul ignore if */
      if ( node === null || node === undefined ) {
        throw new Error("Null Node in Parse Tree");
      }
      return globals.literal(literals[node]);
    }

    var nodeType = literals[node[0]];
    var createFunction = Evaluators[nodeType];

    /* istanbul ignore if */
    if ( !createFunction ) {
      throw new Error("Invalid Node in Parse Tree: " + nodeType);
    }

    return createFunction.apply(node, node.slice(1));
  }

  function createBinaryEvaluator(leftNode, rightNode, operator) {
    var left = createEvaluator(leftNode);
    var right = createEvaluator(rightNode);
    return '(' + left + operator + right + ')';
  }

  function createStatementsEvaluator(statementNodes) {
    if ( !statementNodes.length ) {
      return '';
    }
    return map(statementNodes, createEvaluator).join(';') + ';';
  }

  // generate an evaluator to deal with 'from' and 'import' statements
  function createImportEvaluator(fromNodes) {
    var result = map(fromNodes, function (fromNode) {
      var moduleName = literals[fromNode[0]];
      var importer = globals.builderForLiteral('buildImporter', moduleName);
      var aliases = fromNode[1];
      var moduleAlias = null;
      var toResolve = null;

      if ( isArray(aliases) ) {
        toResolve = map(aliases, function (importInfo) {
          var name = literals[importInfo[0]];
          var alias = importInfo[1] ? literals[importInfo[1]] : name;
          return [alias, name];
        });
      }
      else if ( typeof aliases === 'number' ) {
        moduleAlias = literals[aliases];
      }
      else {
        moduleAlias = moduleName.split('/').pop();
      }

      if ( !toResolve ) {
        return generateDeclaration(moduleAlias, importer + '()');
      }

      var vars = [];
      var anon = generateLocal();
      vars.push(anon + '=' + importer + '()');
      each(toResolve, function(aliasMap) {
        var aliasName = aliasMap[0];
        var aliasProperty = aliasMap[1];
        vars.push(generateAssignment(aliasName, function () {
          return [anon, '[', globals.literal(aliasProperty), ']'].join('');
        }));
      });
      return 'var ' + vars.join(',');
    });
    return result.join(';');
  }

  // generate an evaluator to represent a partial and its associated closure
  function createPartialEvaluator(nameLiteral, paramDefs,
                                  statementNodes, guardNode) {
    var partialName = literals[nameLiteral];
    var create = guardNode ? createGuardedPartial : createUnguardedPartial;
    return generateDeclaration(partialName, create);

    function createGuardedPartial() {
      var definePartial = globals.runtimeImport('defineGuardedPartial');
      var partialLit = globals.literal(partialName);
      var result = [definePartial + '(c,' + partialLit + ','];
      var partialBody = generateFunction(['o'], function () {
        return 'return ' + generateFunction(['w'], paramDefs,
          generateSubcontext(function () {
            var bodyResult = [];
            bodyResult.push(generateIfStatement(
                '!(' + createEvaluator(guardNode) + ')',
                'return o.apply(null,arguments);'
            ));
            bodyResult.push(createStatementsEvaluator(statementNodes));
            return bodyResult.join('');
          })
        )
      });
      result.push(partialBody);
      result.push(')');
      return result.join('');
    }

    function createUnguardedPartial() {
      var definePartial = globals.runtimeImport('definePartial');
      var result = [definePartial + '('];
      var partialBody = generateFunction(['w'], paramDefs,
        generateSubcontext(function () {
          return createStatementsEvaluator(statementNodes);
        })
      );
      result.push(partialBody);
      result.push(')');
      return result.join('');
    }
  }

  // generate a bound call evaluator
  function createBindEvaluator(memberNode, argNodes) {
    var bind = globals.runtimeImport('bind');
    var member = createEvaluator(memberNode);
    var args = createArrayEvaluator(argNodes);
    return [bind, '(', member, ',', args, ')'].join('');
  }

  // generate an evaluator to perform a function or partial call
  function createCallEvaluator(memberNode, argNodes) {
    var exec = globals.runtimeImport('exec');
    var member = createEvaluator(memberNode);
    var args = createArrayEvaluator(argNodes);
    return [exec, '(', member, ',', args, ')'].join('');
  }

  // generate an evaluator to perform local variable assignment
  function createAssignEvaluator(assignmentDefs) {
    if ( !assignmentDefs.length ) {
      return '';
    }
    var vars = map(assignmentDefs, function(assign) {
      return generateAssignment(
        literals[assign[0]],
        deferCreate(assign[1])
      );
    });
    return 'var ' + vars.join(',');
  }

  // generate an evaluator to write an html opening tag
  function createOpenTagEvaluator(nameNode, attributeDefs, selfClose) {
    var name = createEvaluator(nameNode);
    var attributes = wrapAttributeEvaluators(attributeDefs).reverse();
    var alen = attributes.length - 1;

    if ( typeof name === 'function' ) {
      return selfClose ? selfCloseFuncEvaluator : openTagFuncEvaluator;
    }
    return selfClose ? selfCloseLiteralEvaluator : openTagLiteralEvaluator;

    function selfCloseFuncEvaluator(ctx, writer) {
      writer.selfCloseElement(name(ctx, writer), getAttributes(ctx, writer));
    }

    function openTagFuncEvaluator(ctx, writer) {
      writer.startElement(name(ctx, writer), getAttributes(ctx, writer));
    }

    function selfCloseLiteralEvaluator(ctx, writer) {
      writer.selfCloseElement(name, getAttributes(ctx, writer));
    }

    function openTagLiteralEvaluator(ctx, writer) {
      writer.startElement(name, getAttributes(ctx, writer));
    }

    function getAttributes(ctx, writer) {
      var result = {};
      for ( var i = alen; i >= 0; i-- ) {
        var attribute = attributes[i];
        var key = attribute[0];

        if ( typeof key === 'function' ) {
          key = key(ctx, writer);
          if ( key === null ) {
            continue;
          }
        }

        var val = attribute[1];
        if ( typeof val === 'function' ) {
          val = val(ctx, writer);
        }
        result[key] = val;
      }
      return result;
    }
  }

  // generate an evaluator to write an html closing tag
  function createCloseTagEvaluator(nameNode) {
    var name = createEvaluator(nameNode);
    return ['w.endElement(', name, ')'].join('');
  }

  // generate an evaluator to write an html comment
  function createCommentTagEvaluator(contentLiteral) {
    return ['w.comment(', createEvaluator(contentLiteral), ')'].join('');
  }

  // generate an evaluator to write an html5 doctype
  function createDocTypeEvaluator(rootElemLiteral) {
    return ['w.docType(', createEvaluator(rootElemLiteral), ')'].join('');
  }

  // generate an evaluator that writes the result of an expression
  function createOutputEvaluator(exprNode) {
    return ['w.content(', createEvaluator(exprNode), ')'].join('');
  }

  // generate an evaluator that writes the result of an
  // expression without escaping
  function createRawOutputEvaluator(exprNode) {
    return ['w.rawContent(', createEvaluator(exprNode), ')'].join('');
  }

  // generate an evaluator that performs for looping over ranges
  function createForEvaluator(rangeNodes, statementNodes, elseNodes) {
    var loop = globals.runtimeImport('loop');


    // TODO: This broken
    var buffer = [];
    buffer.push(createLocalFunction(statementNodes));
    if ( elseNodes && elseNodes.length ) {
      buffer.push(createLocalFunction(elseNodes));
    }
    for ( var i = 0, len = rangeNodes.length; i < len; i++ ) {
      var rangeNode = rangeNodes[i];
      var name = createEvaluator(rangeNode[0]);
      var collection = createEvaluator(rangeNode[1]);
      if ( i ) {
        buffer.push(loop + '(' + name + ',s,' + collection)
      }
      buffer.push(loop + '(' + name + ',' )
    }

    var ranges = [];
    var rlen = rangeNodes.length;
    var statements = createStatementsEvaluator(statementNodes);
    var elseStatements = elseNodes && createStatementsEvaluator(elseNodes);

    for ( var i = 0, len = rangeNodes.length; i < len; i++ ) {
      var rangeNode = rangeNodes[i];
      ranges[i] = [
        literals[rangeNode[0]],
        wrapLiteral(createEvaluator(rangeNode[1])),
          rangeNode[2] && wrapLiteral(createEvaluator(rangeNode[2]))
      ];
    }
    ranges.reverse();

    return forEvaluator;

    function forEvaluator(ctx, writer) {
      // The entire for loop is only a single nested context
      var newCtx = extendObject(ctx);
      var statementsEvaluated = false;

      processRange(rlen - 1);
      if ( !statementsEvaluated && elseStatements ) {
        elseStatements(ctx, writer);
      }

      function processRange(idx) {
        var range = ranges[idx];
        var name = range[0];
        var data = range[1](newCtx, writer);
        var guard = range[2];
        var items = data;

        if ( typeof data !== 'object' || data === null ) {
          return;
        }

        var createItem;
        if ( isArray(data) ) {
          createItem = createArrayItem;
        }
        else {
          items = objectKeys(data);
          createItem = createObjectItem;
        }

        for ( var i = 0, len = items.length; i < len; i++ ) {
          newCtx[name] = createItem(i);
          if ( guard && !guard(newCtx, writer) ) {
            continue;
          }
          if ( idx ) {
            processRange(idx - 1);
          }
          else {
            statements(newCtx, writer);
            statementsEvaluated = true;
          }
        }

        function createArrayItem(idx) {
          return data[idx];
        }

        function createObjectItem(idx) {
          var name = items[idx];
          return { name: name, value: data[name] };
        }
      }
    }
  }

  // generate an evaluator that borrows the specified expressions
  // as the evaluated node's new scope for locals (remaining immutable)
  function createUsingStmtEvaluator(usingNode, evalNodes) {
    var body = deferCreate(evalNodes, createStatementsEvaluator);
    return createUsingEvaluator(usingNode, body);
  }

  function createUsingExprEvaluator(usingNodes, evalNode) {
    var body = deferCreate(evalNode);
    return createUsingEvaluator(usingNodes, body);
  }

  function createUsingEvaluator(usingNodes, evalBody) {
    return generateSubcontext(function () {
      var using = map(usingNodes, function(node) {
        return createEvaluator(node);
      });
      // Wipe out the locals/names so that any subsequent lookups are
      // forced to be performed from the context itself
      locals = {};
      names = {};
      var mixin = globals.runtimeImport('mixin');
      var result = [mixin + '(c,' + using.join(',') + ')'];
      result.push(generateCode(evalBody));
      return result.join(';');
    });
  }

  // generate a conditional (ternary) evaluator
  function createTernaryEvaluator(conditionNode, trueNode, falseNode) {
    var $1 = createEvaluator(conditionNode);
    var $2 = createEvaluator(trueNode);
    var $3 = createEvaluator(falseNode);
    return '(' + $1 + '?' + $2 + ':' + $3 + ')';
  }

  // generate an if statement evaluator
  function createIfEvaluator(conditionNode, trueNodes, falseNodes) {
    return generateIfStatement(
      deferCreate(conditionNode),
      deferCreate(trueNodes, createStatementsEvaluator),
      deferCreate(falseNodes, createStatementsEvaluator)
    );
  }

  // generate an 'or' evaluator, including short circuiting
  function createOrEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '||');
  }

  // generate an 'and' evaluator, including short circuiting
  function createAndEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '&&');
  }

  // generate a match evaluator
  function createMatchEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode);
    var $2 = createEvaluator(rightNode);
    if ( !isArray(leftNode) ) {
      var matcher = globals.builderForLiteral('buildMatcher', $1);
      return matcher + '(' + $2 + ')';
    }

    var isMatchingObject = globals.runtimeImport('isMatchingObject');
    return isMatchingObject + '(' + $1 + ',' + $2 + ')';
  }

  // generate an equality evaluator
  function createEqEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '===');
  }

  // generate an inequality evaluator
  function createNeqEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '!==');
  }

  // generate a greater-than evaluator
  function createGtEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '>');
  }

  // generate a greater-than or equal to evaluator
  function createGteEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '>=');
  }

  // generate a less-than evaluator
  function createLtEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '<');
  }

  // generate a less-than or equal to evaluator
  function createLteEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '<=');
  }

  // generate an addition evaluator
  function createAddEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '+');
  }

  // generate a subtraction evaluator
  function createSubEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '-');
  }

  // generate a multiplication evaluator
  function createMulEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '*');
  }

  // generate a division evaluator
  function createDivEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '/');
  }

  // generate a remainder evaluator
  function createModEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '%');
  }

  // generate an interpolation evaluator
  function createFormatEvaluator(formatNode, exprNode) {
    var $1 = createEvaluator(formatNode);
    if ( !isArray(formatNode) ) {
      var formatter = globals.builderForLiteral('buildFormatter', $1);
      return formatter + '(' + createEvaluator(exprNode) + ')';
    }

    // Generate a global template cache for dynamic evaluations
    var createFormatterCache = globals.runtimeImport('createFormatterCache');
    var id = globals.nextId('b');
    globals.push([id, '=', createFormatterCache, '()'].join(''));
    return id + '(' + createEvaluator(exprNode) + ')';
  }

  // generate a logical 'not' evaluator
  function createNotEvaluator(node) {
    var $1 = createEvaluator(node);
    return '(!' + $1 + ')';
  }

  // generate a mathematical negation evaluator
  function createNegEvaluator(node) {
    var $1 = createEvaluator(node);
    return '(-' + $1 + ')';
  }

  // generate an array or object member access evaluator
  function createMemberEvaluator(parentNode, elemNode) {
    var getProperty = globals.runtimeImport('getProperty');
    var $1 = createEvaluator(parentNode);
    var $2 = createEvaluator(elemNode);
    return getProperty + '(' + $1 + ',' + $2 + ')';
  }

  // generate an array evaluator
  function createArrayEvaluator(arrayNodes) {
    var result = [];
    for ( var i = 0, len = arrayNodes.length; i < len; i++ ) {
      result.push(createEvaluator(arrayNodes[i]));
    }
    return ['[', result.join(','), ']'].join('');
  }

  // generate a dictionary evaluator
  function createDictionaryEvaluator(assignmentDefs) {
    var result = [];
    for ( var i = 0, len = assignmentDefs.length; i < len; i++ ) {
      var assign = assignmentDefs[i];
      var name = createEvaluator(assign[0]);
      var value = createEvaluator(assign[1]);
      result.push(name + ':' + value);
    }
    return ['{', result.join(','), '}'].join('');
  }

  // generate a local variable retrieval evaluator
  function createIdEvaluator(nameLiteral) {
    return generateGetter(nameLiteral);
  }

  // generate a self-reference evaluator
  function createSelfEvaluator() {
    return 'c';
  }
}

// Exported Functions
exports.generateTemplateBody = generateTemplateBody;
