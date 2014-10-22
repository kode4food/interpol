/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var lang = require('./javascript');
var createGlobals = lang.createGlobals;
var createModule = lang.createModule;

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
  var sharedGlobals = !!options.globals;
  var globals = options.globals || createGlobals();
  var gen = createModule(globals)
  var functionWrapper = options.functionWrapper || noWrapper;

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

  return functionWrapper(function () {
    var defineTemplate = globals.runtimeImport('defineTemplate');

    // createStatementsEvaluator will populate globalVars
    createStatementsEvaluator(parseTree);
    var body = gen.toString()

    var buffer = [];
    if ( !sharedGlobals ) {
      buffer.push(globals.toString());
    }

    buffer.push('return ' + defineTemplate + '(function(c,w){');
    buffer.push(body);
    buffer.push('});');

    return buffer.join('');
  });

  function noWrapper(value) {
    if ( typeof value === 'function' ) {
      return value();
    }
    return value;
  }

  function defer(func) {
    var args = arguments;
    if ( typeof func === 'function' ) {
      args = slice.call(arguments, 1);
    }
    else {
      func = createEvaluator;
    }

    return function () {
       return func.apply(null, args);
    };
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
      var literal = globals.literal(literals[node]);
      gen.write(literal);
      return;
    }

    var nodeType = literals[node[0]];
    var createFunction = Evaluators[nodeType];

    /* istanbul ignore if */
    if ( !createFunction ) {
      throw new Error("Invalid Node in Parse Tree: " + nodeType);
    }

    createFunction.apply(node, node.slice(1));
  }

  function createBinaryEvaluator(leftNode, rightNode, operator) {
    gen.binaryOperator(defer(leftNode), defer(rightNode), operator);
  }

  function createStatementsEvaluator(statementNodes) {
    each(statementNodes, createEvaluator);
  }

  // generate an evaluator to deal with 'from' and 'import' statements
  function createImportEvaluator(fromNodes) {
    var result = map(fromNodes, function (fromNode) {
      var moduleName = literals[fromNode[0]];
      var moduleId = globals.literal(moduleName);
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

      var importer = globals.builderForLiteral('buildImporter', moduleId);
      var getProperty = globals.runtimeImport('getProperty');

      if ( !toResolve ) {
        gen.assignments([ [moduleAlias, gen.call(importer, [gen.self])] ]);
        return;
      }

      var assigns = [];
      var anon = gen.anonymous();
      assigns.push([
        anon,
        gen.code(function () {
          gen.call(importer, [gen.self]);
        })
      ]);
      each(toResolve, function (aliasMap) {
        assigns.push([
          aliasMap[0],
          gen.code(function () {
            gen.call(getProperty, [anon, globals.literal(aliasMap[1])]);
          })
        ]);
      });
      gen.assignments(assigns);
    });
  }

  // generate an evaluator to represent a partial and its associated closure
  function createPartialEvaluator(nameLiteral, paramDefs,
                                  statementNodes, guardNode) {
    var partialName = literals[nameLiteral];
    var paramNames = map(paramDefs, function (paramDef) {
      return literals[paramDef];
    });
    var create = guardNode ? createGuardedPartial : createUnguardedPartial;
    if ( isLocalLookup(partialName) ) {
      return generateAssignment(partialName, create);
    }
    return generateDeclaration(partialName, create);

    function createUnguardedPartial() {
      var definePartial = globals.runtimeImport('definePartial');
      var result = [];
      result.push([definePartial, '('].join(''));
      var partialBody = gen.func(
        { args: ['w'], contextArgs: paramNames, subcontext: true },
        function () {
          return createStatementsEvaluator(statementNodes);
        });
      result.push(partialBody);
      result.push(')');
      return result.join('');
    }

    function createGuardedPartial() {
      var definePartial = globals.runtimeImport('defineGuardedPartial');
      var originalPartial = gen.getter(partialName);

      var result = [];
      result.push([definePartial, '(', originalPartial, ','].join(''));
      var partialBody = gen.func({ args: ['o'] }, function () {
        return ['return ', gen.func(
          { args: ['w'], contextArgs: paramNames, subcontext: true,
            storeArguments: true },
          function () {
            var bodyResult = [];
            bodyResult.push(gen.ifStatement(
                createEvaluator(guardNode),
                'return o.apply(null,a);',
                true  // not
            ));
            bodyResult.push(createStatementsEvaluator(statementNodes));
            return bodyResult.join('');
          }), ';'].join('');
      });
      result.push(partialBody);
      result.push(')');
      return result.join('');
    }
  }

  // generate a bound call evaluator
  function createBindEvaluator(memberNode, argNodes) {
    var bind = globals.runtimeImport('bind');
    var member = defer(memberNode);
    var args = defer(createArrayEvaluator, argNodes);
    gen.call(bind, [gen.self, member, args]);
  }

  // generate an evaluator to perform a function or partial call
  function createCallEvaluator(memberNode, argNodes) {
    var exec = globals.runtimeImport('exec');
    var member = defer(memberNode);

    var args = [gen.writer()];
    each(argNodes, function (argNode) {
      args.push(defer(argNode));
    });

    gen.call(exec, [gen.self, member, defer(gen.array, args)]);
  }

  // generate an evaluator to perform local variable assignment
  function createAssignEvaluator(assignmentDefs) {
    var assigns = map(assignmentDefs, function (assignmentDef) {
      return [
        literals[assignmentDef[0]],
        defer(assignmentDef[1])
      ];
    });
    gen.assignments(assigns);
  }

  // generate an evaluator to write an html opening tag
  function createOpenTagEvaluator(nameNode, attributeDefs, selfClose) {
    var name = defer(nameNode);
    var attributes = defer(createDictionaryEvaluator, attributeDefs, true);
    var methodName = selfClose ? 'selfCloseElement' : 'startElement';
    gen.statement(function () {
      gen.call(gen.writer(methodName), [name, attributes]);
    });
  }

  // generate an evaluator to write an html closing tag
  function createCloseTagEvaluator(nameNode) {
    gen.statement(function () {
      gen.call(gen.writer('endElement'), [defer(nameNode)]);
    });
  }

  // generate an evaluator to write an html comment
  function createCommentTagEvaluator(contentLiteral) {
    gen.statement(function () {
      gen.call(gen.writer('comment'), [defer(contentLiteral)]);
    });
  }

  // generate an evaluator to write an html5 doctype
  function createDocTypeEvaluator(rootElemLiteral) {
    gen.statement(function () {
      gen.call(gen.writer('docType'), [defer(rootElemLiteral)]);
    });
  }

  // generate an evaluator that writes the result of an expression
  function createOutputEvaluator(exprNode) {
    gen.statement(function () {
      gen.call(gen.writer('content'), [defer(exprNode)]);
    });
  }

  // generate an evaluator that writes the result of an
  // expression without escaping
  function createRawOutputEvaluator(exprNode) {
    gen.statement(function () {
      gen.call(gen.writer('raw'), [defer(exprNode)]);
    });
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
  function createUsingStmtEvaluator(usingNodes, evalNodes) {
    var body = defer(createStatementsEvaluator, evalNodes);
    createUsingEvaluator(usingNodes, body);
  }

  function createUsingExprEvaluator(usingNodes, evalNode) {
    createUsingEvaluator(usingNodes, function () {
      gen.return(defer(evalNode));
    });
  }

  function createUsingEvaluator(usingNodes, evalBody) {
    var mixin = globals.runtimeImport('mixin');

    gen.subcontext(function () {
      var using = map(usingNodes, function (node) {
        return gen.code(defer(node));
      });
      // Wipe out the locals/names so that any subsequent lookups are
      // forced to be performed from the context itself
      gen.resetLocals();
      gen.call(mixin, [gen.self].concat(using));
      evalBody();
    });
  }

  // generate a conditional (ternary) evaluator
  function createTernaryEvaluator(conditionNode, trueNode, falseNode) {
    gen.conditionalOperator(
      defer(conditionNode),
      defer(trueNode),
      defer(falseNode)
    );
  }

  // generate an if statement evaluator
  function createIfEvaluator(conditionNode, trueNodes, falseNodes) {
    gen.ifStatement(
      defer(conditionNode),
      defer(createStatementsEvaluator, trueNodes),
      defer(createStatementsEvaluator, falseNodes)
    );
  }

  // generate an 'or' evaluator, including short circuiting
  function createOrEvaluator(leftNode, rightNode) {
    createTernaryEvaluator(leftNode, leftNode, rightNode);
  }

  // generate an 'and' evaluator, including short circuiting
  function createAndEvaluator(leftNode, rightNode) {
    createTernaryEvaluator(leftNode, rightNode, leftNode);
  }

  // generate a match evaluator
  function createMatchEvaluator(leftNode, rightNode) {
    var left = defer(leftNode);
    var right = defer(rightNode);
    if ( !isArray(rightNode) ) {
      var matcher = globals.builderForLiteral('buildMatcher', gen.code(right));
      gen.call(matcher, [left]);
      return;
    }

    var isMatchingObject = globals.runtimeImport('isMatchingObject');
    gen.call(isMatchingObject, [right, left]);
  }

  // generate an equality evaluator
  function createEqEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'eq');
  }

  // generate an inequality evaluator
  function createNeqEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'neq');
  }

  // generate a greater-than evaluator
  function createGtEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'gt');
  }

  // generate a greater-than or equal to evaluator
  function createGteEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'ge');
  }

  // generate a less-than evaluator
  function createLtEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'lt');
  }

  // generate a less-than or equal to evaluator
  function createLteEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'le');
  }

  // generate an addition evaluator
  function createAddEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'add');
  }

  // generate a subtraction evaluator
  function createSubEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'sub');
  }

  // generate a multiplication evaluator
  function createMulEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'mul');
  }

  // generate a division evaluator
  function createDivEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'div');
  }

  // generate a remainder evaluator
  function createModEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'mod');
  }

  // generate an interpolation evaluator
  function createFormatEvaluator(formatNode, exprNode) {
    var formatStr = defer(formatNode);
    if ( !isArray(formatNode) ) {
      // have to do this for left sided literals
      var formatter = globals.builderForLiteral('buildFormatter',
                                                gen.code(formatStr));
      gen.call(formatter, [gen.self, defer(exprNode)]);
      return;
    }

    // Generate a global template cache for dynamic evaluations
    var formatterCache = globals.builder('createFormatterCache');
    gen.call(formatterCache, [gen.self, formatStr, defer(exprNode)]);
  }

  // generate a logical 'not' evaluator
  function createNotEvaluator(node) {
    var isTruthy = globals.runtimeImport('isTruthy');
    gen.unary(function () {
      gen.call(isTruthy, [defer(node)]);
    }, 'not');
  }

  // generate a mathematical negation evaluator
  function createNegEvaluator(node) {
    gen.unaryOperator(defer(node), 'neg');
  }

  // generate an array or object member access evaluator
  function createMemberEvaluator(parentNode, elemNode) {
    var getProperty = globals.runtimeImport('getProperty');
    gen.call(getProperty, [
      defer(parentNode),
      defer(elemNode)
    ]);
  }

  // generate an array evaluator
  function createArrayEvaluator(arrayNodes) {
    gen.array(map(arrayNodes, defer));
  }

  // generate a dictionary evaluator
  function createDictionaryEvaluator(propertyDefs, ordered) {
    var result = map(propertyDefs, function (propertyDef) {
      var name;
      if ( !isArray(propertyDef[0]) ) {
        name = literals[propertyDef[0]];
      }
      else {
        name = defer(propertyDef[0]);
      }
      return [name, defer(propertyDef[1])];
    });
    gen.object(result, ordered);
  }

  // generate a local variable retrieval evaluator
  function createIdEvaluator(nameLiteral) {
    gen.getter(literals[nameLiteral]);
  }

  function createSelfEvaluator() {
    gen.self();
  }
}

// Exported Functions
exports.generateTemplateBody = generateTemplateBody;
