/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = require('../interpol');
var util = require('../util');
var types = require('../types');
var parser = require('./parser');
var format = require('../format');
var match = require('../match');
var annotations = require('./annotations');

var isArray = util.isArray;
var objectKeys = util.objectKeys;
var each = util.each;
var map = util.map;
var selfMap = util.selfMap;

var escapeContent = types.escapeContent;
var escapeAttribute = types.escapeAttribute;
var stringify = types.stringify;
var isTruthy = types.isTruthy;
var isIn = types.isIn;

var symbol = parser.symbol;
var isStatements = parser.isStatements;
var markStatements = parser.markStatements;
var isSymbol = parser.isSymbol;
var hasOperator = parser.hasOperator;
var isIdentifier = parser.isIdentifier;
var isLiteral = parser.isLiteral;
var isInterpolation = parser.isInterpolation;

var isMatchingObject = match.matches;
var annotate = annotations.annotate;

var slice = Array.prototype.slice;

var inverseOperators = {
  'eq': 'nq', 'nq': 'eq',
  'lt': 'ge', 'ge': 'lt',
  'gt': 'le', 'le': 'gt'
};

var createTag = {
  'op': createOpenTag,
  'cl': createCloseTag,
  'ct': createCommentTag
};

var constantFolders = {
  'no': function (v) { return !isTruthy(v); },
  'ne': function (v) { return -v; },
  'ad': function (l, r) { return l + r; },
  'su': function (l, r) { return l - r; },
  'mu': function (l, r) { return l * r; },
  'di': function (l, r) { return l / r; },
  'eq': function (l, r) { return l === r; },
  'nq': function (l, r) { return l !== r; },
  'in': function (l, r) { return isIn(l, r); },
  'ni': function (l, r) { return !isIn(l, r); },
  'gt': function (l, r) { return l > r; },
  'lt': function (l, r) { return l < r; },
  'ge': function (l, r) { return l >= r; },
  'le': function (l, r) { return l <= r; },
  'mo': function (l, r) { return l % r; },
  'ma': function (l, r) { return isMatchingObject(r, l); },  
  'mb': function (l, r) {
          if ( l === undefined ) { return l; }
          var res = l[r];
          return res === null ? undefined : res;
        }
};

var shortCircuitFolders = {
  'or': function (l, r) { return isTruthy(l.value) ? l : r; },
  'an': function (l, r) { return isTruthy(l.value) ? r : l; },
  'cn': function (c, t, f) { return isTruthy(c.value) ? t : f; }
};

var constantFolderKeys = objectKeys(constantFolders);
var shortCircuitFolderKeys = objectKeys(shortCircuitFolders);

function rewriteSyntaxTree(syntaxTree, warnings) {
  warnings = warnings || [];
  var nodeStack = [];

  var pipeline = [
    rewriteSymbols(createFormatterNodes, isInterpolation),
    rewriteOperators(foldShortCircuits, matchOps(shortCircuitFolderKeys)),
    rewriteOperators(foldConstants, matchOps(constantFolderKeys)),
    rewriteOperators(flipConditionals, matchOps('cn', 'if')),
    rewriteOperators(flipEquality, matchOps('no')),
    rewriteOperators(promoteNot, matchOps('an', 'or')),
    rewriteOperators(literalFromArray, matchOps('ar')),
    rewriteOperators(literalFromDictionary, matchOps('dc')),
    rewriteOperators(immediateInterpolation, matchOps('ca')),
    rewriteOperators(selfFormatFromDictionary, matchOps('fm')),
    rewriteStatements(foldIfStatements),
    rewriteStatements(hoistPartials),

    rewriteGroups(mergePartials, matchPartialStatements),
    rewriteOperators(rollUpForLoops, matchOps('fr')),
    rewriteOperators(rollUpMemberPaths, matchOps('mb')),
    rewriteOperators(promoteRawLiteralOutput, matchOps('ou')),
    rewriteOperators(convertLiteralHTML, matchOps('op', 'cl', 'ct')),
    rewriteGroups(mergeRawOutput, matchOps('ra')),

    rewriteOperators(assignPartials, matchPartialStatements),

    rewriteOperators(annotateSelfReferences, matchOps('se')),
    rewriteOperators(annotateMutations, matchOps('as')),

    finalizeRoot
  ];

  each(pipeline, function (func) {
    // Mark the root for matching
    syntaxTree.root = true;
    syntaxTree = func(syntaxTree);
  });

  return syntaxTree;

  function finalizeRoot(node) {
    annotate(node, 'self', 'read');
    return node;
  }

  function annotateNearestParent(group, name, matcher) {
    for ( var i = nodeStack.length - 1; i >= 0; i-- ) {
      var node = nodeStack[i];
      if ( matcher(node) ) {
        annotate(node, group, name);
        return;
      }
    }
  }

  function annotateUpTree(group, name, matcher) {
    var matched = false;
    each(nodeStack, function (child) {
      if ( matcher(child) ) {
        annotate(child, group, name);
        matched = true;
      }
    });

    return matched;
  }

  function rewriteNodes(node, processor, matcher) {
    return rewriteNode(node);

    function rewriteNode(node) {
      if ( isArray(node) ) {
        // Depth-first Processing
        nodeStack.push(node);
        selfMap(node, rewriteNode);
        nodeStack.pop();
      }

      // Now the real work
      if ( matcher(node) ) {
        return processor(node);
      }
      return node;
    }
  }

  function rewriteSymbols(processor, matcher) {
    return symbolRewriter;

    function symbolRewriter(node) {
      return rewriteNodes(node, processor, symbolMatcher);
    }

    function symbolMatcher(node) {
      return isSymbol(node) && matcher(node);
    }
  }

  function rewriteOperators(processor, matcher) {
    return operatorRewriter;

    function operatorRewriter(node) {
      return rewriteNodes(node, processor, operatorMatcher);
    }

    function operatorMatcher(node) {
      return hasOperator(node) && matcher(node);
    }
  }

  function rewriteStatements(processor) {
    return statementsRewriter;

    function statementsRewriter(node) {
      return rewriteNodes(node, statementsProcessor, isStatements);
    }

    function statementsProcessor(node) {
      return markStatements(processor(node));
    }
  }

  // Iterates over a set of statements and presents adjacent groups
  // to the callback function for replacement
  function rewriteGroups(processor, matcher) {
    return rewriteStatements(groupProcessor);

    function groupProcessor(statements) {
      var group = [];
      var output = [];

      each(statements, function (statement) {
        if ( matcher(statement) ) {
          group.push(statement);
        }
        else {
          processMatches();
          output.push(statement);
        }
      });

      processMatches();
      return output;

      function processMatches() {
        var result = group.length < 2 ? group : processor(group);
        output = output.concat(result);
        group = [];
      }
    }
  }

  function createFormatterNodes(node) {
    var formatter = node.formatter;
    var result = [symbol('fm', node), node];

    var requiredFunctions = formatter.__intRequiredFunctions || [];
    var requiredIndexes = node.formatter.__intRequiredIndexes || [];

    if ( !requiredIndexes.length ) {
      throw new Error("Stupid Coder: Interpolating a non-escaped String!");
    }

    if ( requiredFunctions.length ) {
      // build a dictionary from the names
      var supportFuncElems = map(requiredFunctions, function (funcName) {
        return [
          symbol(funcName, 'id'),
          [symbol('id'), symbol(funcName, 'lit')]
        ];
      });
      result.push([symbol('dc'), supportFuncElems]);
    }
    else {
      result.push(symbol({}, 'lit'));
    }

    result.formatter = formatter;
    return result;
  }

  // if an 'if' statement is evaluating a constant, then we can eliminate
  // the inapplicable branch and just inline the matching statements
  function foldIfStatements(statements) {
    var output = [];
    each(statements, function (statement) {
      if ( !hasOperator(statement, 'if') || !isLiteral(statement[1]) ) {
        output.push(statement);
        return;
      }
      var result = isTruthy(statement[1].value) ? statement[2] : statement[3];
      output = output.concat(result);
    });
    return output;
  }

  // Hoisting *only* occurs when the following condition is met:
  //
  //   (!partial_definition)+
  //   partial_definition+
  //
  // meaning that partial definitions can't be interspersed with
  // regular statements.  In that case, the logic is assumed too
  // complex to make a responsible guess as to the developer's
  // intentions.
  function hoistPartials(statements) {
    if ( statements.length < 2 ) {
      return statements;
    }

    var partials = [];
    var others = [];
    var invalid;

    each(statements, function (statement) {
      if ( hasOperator(statement, 'de') ) {
        if ( !invalid && !others.length ) {
          // Either all partials or we don't meet hoisting conditions
          invalid = statement;
        }
        partials.push(statement);
      }
      else {
        if ( !invalid && partials.length ) {
          // We don't hoist under these conditions
          invalid = partials[partials.length - 1];
        }
        others.push(statement);
      }
    });

    if ( invalid ) {
      if ( others.length ) {
        issueWarning(invalid[0],
          "Will only perform 'hoisting' if all partials are placed after " +
          "other statements"
        );
      }
      return statements;
    }
    return partials.concat(others);
  }

  function matchPartialStatements(node) {
    return hasOperator(node, 'de') && node[1];
  }
  
  // We can combine multiple sequential compatible partials into a
  // single branched partial
  function mergePartials(statements) {
    var namedDefs = {};
    each(statements, function (statement) {
      var name = statement[1].value;
      var group = namedDefs[name] || ( namedDefs[name] = [] );

      if ( !statement[4] && group.length ) {
        // if we see an unguarded, blow away previous definitions
        issueWarning(statement[0],
          "The unguarded Partial '" + name + "' will replace " +
          "any previous definitions"
        );
        group = [];
      }

      group.push(statement);
    });

    var result = [];
    for ( var key in namedDefs ) {
      var definitions = namedDefs[key];
      if ( definitions.length === 1 ) {
        result.push(definitions[0]);
        continue;
      }
      result = result.concat(mergeDefinitions(key, definitions));
    }
    return result;

    function mergeDefinitions(name, definitions) {
      var firstDefinition = definitions[0];
      var originalArgs = argumentsSignature(firstDefinition[2]);
      var statements = firstDefinition[3];
      var guard = firstDefinition[4];

      if ( guard ) {
        statements = [
          [symbol('if'), guard, statements, []]
        ];
      }

      for ( var i = 1, len = definitions.length; i < len; i++ ) {
        var definition = definitions[i];
        var theseArgs = argumentsSignature(definition[2]);
        if ( originalArgs !== theseArgs ) {
          // Short-circuit, won't make assumptions about local names
          issueWarning(definition[0],
            "Reopened partial '" + name + "' has different " +
            "argument names than the original definition"
          );
          return definitions;
        }

        var theseStatements = definition[3];
        var thisGuard = definition[4];

        statements = [
          [symbol('if'), thisGuard, theseStatements, statements]
        ];
        guard = guard && [symbol('or'), thisGuard, guard];
      }

      firstDefinition[3] = statements;
      if ( guard ) {
        firstDefinition[4] = guard;
      }
      return [firstDefinition];
    }
  }

  function matchOps(ops) {
    if ( !isArray(ops) ) {
      ops = slice.call(arguments, 0);
    }
    return matcher;

    function matcher(node) {
      return hasOperator(node, ops);
    }
  }

  function matchOpsOrRoot(ops) {
    var opsMatcher = matchOps(ops);
    return matcher;

    function matcher(node) {
      var op = opsMatcher(node);
      if ( op ) {
        return op;
      }
      return node.root;
    }
  }

  // Partial declarations are really 'let name = partial'
  function assignPartials(node) {
    return [ symbol('as'), [ [node[1], node] ] ];
  }

  // Convert literal output to pre-escaped raw output
  function promoteRawLiteralOutput(node) {
    if ( !isLiteral(node[1]) ) {
      return node;
    }
    var content = escapeContent(node[1].value);
    return [symbol('ra'), symbol(content, 'lit')];
  }

  // Literal HTML tags can be converted to raw output
  function convertLiteralHTML(node) {
    var op = hasOperator(node);
    var tag = createTag[op](node);
    return tag ? [symbol('ra'), symbol(tag, 'lit')] : node;
  }

  // We can combine sequences of raw literal output
  function mergeRawOutput(statements) {
    var buffer = map(statements, function (statement) {
      return statement[1].value;
    }).join('');

    return [ [symbol('ra'), symbol(buffer, 'lit')] ];
  }

  function annotateMutations(node) {
    each(node[1], function (assignment) {
      annotateNearestParent(
        'mutations',
        assignment[0].value,
        matchOpsOrRoot(['de', 'fr'])
      );
    });
    return node;
  }

  // We can roll up a single nested for loop into a containing for
  // loop so that they share the same context
  function rollUpForLoops(node) {
    var forStatements = node[2];

    if ( forStatements.length !== 1 ) {
      return node;  // should only be one child
    }
    if ( !hasOperator(forStatements[0], 'fr') ) {
      return node;  // should have a nested for loop
    }

    var nested = forStatements[0];
    if ( node[3].length || nested[3].length ) {
      return node;  // no else clauses
    }

    node[1] = node[1].concat(nested[1]);
    node[2] = nested[2];
    return node;
  }

  // if a member operator contains another member operator, it can be rolled 
  // up into a single path operator
  function rollUpMemberPaths(node) {
    var target = node[1];
    if ( !hasOperator(target, 'mb') ) {
      return node;
    }
    target[2] = target[2].concat(node[2]);
    return target;
  }

  // Or, And, Conditional Folding
  function foldShortCircuits(node) {
    if ( !isLiteral(node[1]) ) {
      return node;
    }
    var op = hasOperator(node);
    var args = node.slice(1);
    return shortCircuitFolders[op].apply(null, args);
  }
  
  // Simple constant folding
  function foldConstants(node) {
    var args = [];
    for ( var i = 1, len = node.length; i < len; i++ ) {
      var arg = node[i];
      if ( !isLiteral(arg) ) {
        return node;
      }
      args.push(arg.value);
    }
    var op = hasOperator(node);
    var output = constantFolders[op].apply(null, args);
    return symbol(output, 'lit', node[0]);
  }
  
  // If the condition is 'not' we can roll up its argument
  // and flip the branches.
  function flipConditionals(node) {
    var cond = node[1];
    if ( !hasOperator(cond, 'no') ) {
      return node;
    }
    // Make it so
    node[1] = cond[1];
    var tmp = node[2];
    node[2] = node[3];
    node[3] = tmp;
    return node;
  }

  // if the operator is 'not' and it contains an equality,
  // then we can flip the equality operator and roll it up
  function flipEquality(node) {
    var child = node[1];
    var op = hasOperator(child);
    var newOp = inverseOperators[op];

    if ( !op || !newOp ) {
      return node;
    }

    child[0].value = newOp;
    return child;
  }

  // If left and right operands of an 'and' or 'or' are using the 'not'
  // unary, then promote it to the top and flip the and/or
  function promoteNot(node) {
    var left = node[1];
    var leftOp = hasOperator(left, 'no');
    var right = node[2];
    var rightOp = hasOperator(right, 'no');

    if ( !leftOp || !rightOp ) {
      return node;
    }

    var op = hasOperator(node);
    var newOp = op === 'an' ? 'or' : 'an';
    return [ symbol('no', left), [symbol(newOp, node), left[1], right[1]] ];
  }

  // If all the elements of an Array are literals, then we can convert
  // the list to a literal array for the literal table
  function literalFromArray(node) {
    var elements = node[1];
    var output = [];

    for ( var i = 0, len = elements.length; i < len; i++ ) {
      var element = elements[i];
      if ( !isLiteral(element) ) {
        return node;
      }
      output.push(element.value);
    }

    return symbol(output, 'lit', node[0]);
  }

  // If all the elements of a Dictionary are literals, then we can
  // convert the list to a literal object for the literal table
  function literalFromDictionary(node) {
    var elements = node[1];
    var output = {};

    for ( var i = 0, len = elements.length; i < len; i++ ) {
      var element = elements[i];
      var name = element[0];
      var value = element[1];
      if ( (!isIdentifier(name) && !isLiteral(name)) || !isLiteral(value) ) {
        return node;
      }
      output[name.value] = value.value;
    }

    return symbol(output, 'lit', node[0]);
  }

  // If the left side of a call is a formatter, then we can generate code
  // that will immediately provide the evaluated expression to that formatter
  // instead of nesting the calls
  function immediateInterpolation(node) {
    var member = node[1];
    if ( !hasOperator(member, 'fm') ) {
      // Nothing to do here
      return node;
    }

    var args = node[2];
    member.push(args[0]);
    return member;
  }

  function selfFormatFromDictionary(node) {
    if ( node.length === 3 ) {
      return node;
    }

    var expr = node[3];
    if ( !hasOperator(expr, 'se') ) {
      return node;
    }

    var requiredIndexes = node.formatter.__intRequiredIndexes || [];
    var varNameElems = map(requiredIndexes, function (varName) {
      return [
        symbol(varName, 'id'),
        [symbol('id'), symbol(varName, 'lit')]
      ];
    });

    node[3] = [symbol('dc'), varNameElems];
    return node;
  }

  function annotateSelfReferences(node) {
    annotateUpTree('self', 'read', hasOperator);
    return node;
  }

  function issueWarning(source, message) {
    warnings.push({
      line: source.line,
      column: source.column,
      message: message
    });
  }
}

function argumentsSignature(argNames) {
  if ( !argNames || !argNames.length ) {
    return '';
  }

  return map(argNames, function (argName) {
    return argName.value;
  }).join(',');
}

function createOpenTag(statement) {
  if ( !isIdentifier(statement[1]) ) {
    return;
  }

  var tag = ["<", statement[1].value];
  var attrs = statement[2];
  if ( attrs && attrs.length ) {
    for ( var i = 0, len = attrs.length; i < len; i++ ) {
      var attr = attrs[i];
      if ( !isIdentifier(attr[0]) || !isLiteral(attr[1]) ) {
        return;
      }

      var val = attr[1].value;
      if ( typeof val !== 'boolean' ) {
        var content = escapeAttribute(val);
        tag.push(" ", attr[0].value, "=\"", content, "\"");
        continue;
      }

      if ( val ) {
        tag.push(" ", attr[0].value);
      }
    }
  }

  if ( statement[3] ) {
    tag.push(" /");
  }
  tag.push(">");

  return tag.join('');
}

function createCloseTag(statement) {
  if ( !isIdentifier(statement[1]) ) {
    return;
  }
  return ["</", statement[1].value, ">"].join('');
}

function createCommentTag(statement) {
  return ["<!--", statement[1].value, "-->"].join('');
}

// Exported Functions
exports.rewriteSyntaxTree = rewriteSyntaxTree;
