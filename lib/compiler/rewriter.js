/*
 * Interpol (Templates Sans Facial Hair)
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

var isArray = util.isArray;
var objectKeys = util.objectKeys;
var mixin = util.mixin;
var each = util.each;
var map = util.map;
var selfMap = util.selfMap;

var escapeContent = types.escapeContent;
var escapeAttribute = types.escapeAttribute;
var stringify = types.stringify;
var isTruthy = types.isTruthy;
var buildFormatter = format.buildFormatter;

var sym = parser.sym;
var isStatements = parser.isStatements;
var hasOperator = parser.hasOperator;
var isIdentifier = parser.isIdentifier;
var isLiteral = parser.isLiteral;
var isAutoInterpolated = parser.isAutoInterpolated;

var isMatchingObject = require('../match').isMatchingObject;

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
  var annotations = {};

  warnings = warnings || [];
  var nodeStack = [];
  var annotations = {};

  var pipeline = [
    nodes(foldShortCircuits),
    nodes(foldConstants),
    nodes(flipConditionals),
    nodes(flipEquality),
    nodes(promoteNot),
    nodes(literalFromArray),
    nodes(literalFromDictionary),
    nodes(selfFormatFromDictionary),

    statements(foldIfStatements),
    statements(hoistPartials),
    groups(mergePartials, matchOps('de')),
    statements(rollUpForLoops),
    statements(promoteRawLiteralOutput),
    statements(convertLiteralHTML),
    groups(mergeRawLiteralOutput, matchOps('ra')),

    nodes(assignPartials),
    nodes(annotateSelfReferences),
    nodes(annotateMutations),

    rollUpStatements
  ];

  each(pipeline, function (func) {
    syntaxTree = func(syntaxTree);
  });

  // Any top-level assignments must be performed into a Context
  addAnnotation('self', 'read', true);
  anchorAnnotationsDownTree(
    syntaxTree,
    ['self'],
    not(matchOps(['de', 'fr', 'us', 'ux']))
  );

  return syntaxTree;

  function matchAllNodes() {
    return true;
  }

  function matchAllOperators(node) {
    return hasOperator(node);
  }

  function rewriteNodes(node, matcher, processor) {
    if ( typeof processor !== 'function' ) {
      processor = matcher;
      matcher = matchAllNodes;
    }
    return rewrite(node);

    function rewrite(node) {
      // Depth-first Processing
      if ( !isArray(node) ) {
        if ( isStatements(node) ) {
          nodeStack.push(node);
          node.stmts = rewrite(node.stmts);
          nodeStack.pop();
        }
      }
      else {
        nodeStack.push(node);
        node = map(node, rewrite);
        nodeStack.pop();
      }
      // Now the real work
      if ( matcher(node) ) {
        node = processor(node);
      }
      return node;
    }
  }

  function nodes(processor, matcher) {
    if ( !matcher ) {
      matcher = matchAllOperators;
    }
    return rewrite;

    function rewrite(node) {
      return rewriteNodes(node, matcher, processor);
    }
  }

  function statements(processor) {
    return nodes(statementsProcessor, statementsMatcher);

    function statementsMatcher(node) {
      return isStatements(node);
    }

    function statementsProcessor(node) {
      node.stmts = processor(node.stmts);
      return node;
    }
  }

  // Iterates over a set of statements and presents adjacent groups
  // to the callback function for replacement
  function groups(processor, matcher) {
    return statements(groupProcessor);

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
        var result = group.length < 2 ?  group : processor(group);
        output = output.concat(result);
        group.length = 0;
      }
    }
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
    var invalid = null;

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
        group.length = 0;
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
          [sym('if'), guard, statements, []]
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
          [sym('if'), thisGuard, theseStatements, statements]
        ];
        guard = guard && [sym('or'), thisGuard, guard];
      }

      firstDefinition[3] = statements;
      if ( guard ) {
        firstDefinition[4] = guard;
      }
      return [firstDefinition];
    }
  }

  function not(matcher) {
    return notMatcher;

    function notMatcher(node) {
      return !matcher(node);
    }
  }

  function matchOps(ops) {
    if ( !isArray(ops) ) {
      ops = [ops];
    }
    return matcher;

    function matcher(node) {
      return hasOperator(node, ops);
    }
  }

  // Partial declarations are really 'let name = partial'
  function assignPartials(statements) {
    return mapNodes(
      statements,
      matchOps('de'),
      function (statement) {
        return [ sym('as'), [ [statement[1], statement] ] ];
      }
    );
  }

  // Convert literal output to pre-escaped raw output
  function promoteRawLiteralOutput(statements) {
    return mapNodes(statements, matcher, processStatement);

    function matcher(statement) {
      return hasOperator(statement, 'ou') &&
             isLiteral(statement[1]);
    }

    function processStatement(statement) {
      var content = escapeContent(stringify(statement[1].value));
      return [sym('ra'), sym(content, 'lit')];
    }
  }

  // Literal HTML tags can be converted to raw output
  function convertLiteralHTML(statements) {
    return mapNodes(
      statements,
      matchOps(['op', 'cl', 'ct']),
      processStatement
    );

    function processStatement(statement) {
      var op = hasOperator(statement, ['op', 'cl', 'ct']);
      var tag = createTag[op](statement);
      return tag ? [sym('ra'), sym(tag, 'lit')] : statement;
    }
  }

  // We can combine sequences of raw literal output
  function mergeRawLiteralOutput(statements) {
    var buffer = '';
    var result = [];

    each(statements, function (statement) {
      var output = statement[1];
      if ( isLiteral(output) ) {
        buffer = buffer + stringify(output.value);
      }
      else {
        processBuffer();
        result.push(statement);
      }
    });

    processBuffer();
    return result;

    function processBuffer() {
      if ( !buffer.length ) {
        return;
      }
      result.push([sym('ra'), sym(buffer, 'lit')]);
      buffer = '';
    }
  }

  function addAnnotation(group, name, value) {
    var groupObject = annotations[group];
    if ( !groupObject ) {
      annotations[group] = groupObject = {};
    }
    groupObject[name] = value;
  }

  function anchorAnnotations(node, groupNames, upTree) {
    if ( !groupNames ) {
      groupNames = objectKeys(annotations);
    }
    var nodes = [node];
    if ( upTree ) {
      nodes = nodes.concat(nodeStack);
    }

    each(nodes, function (targetNode) {
      if ( !isArray(targetNode) ) {
        return;
      }

      var targetAnnotations = targetNode.annotations;
      if ( !targetAnnotations ) {
        targetAnnotations = targetNode.annotations = {};
      }

      each(groupNames, function (groupName) {
        var targetGroup = targetAnnotations[groupName];
        if ( !targetGroup ) {
          targetGroup = targetAnnotations[groupName] = {};
        }
        mixin(targetGroup, annotations[groupName]);
      });
    });

    each(groupNames, function (groupName) {
      delete annotations[groupName];
    });
  }

  function anchorAnnotationsUpTree(node, groupNames) {
    anchorAnnotations(node, groupNames, true);
  }

  function anchorAnnotationsDownTree(node, groupNames, matcher) {
    visitChildren,
    each(groupNames, function (groupName) {
      delete annotations[groupName];
    });

    function visitChildren(targetNode) {
      var targetAnnotations = targetNode.annotations;
      if ( !targetAnnotations ) {
        targetAnnotations = targetNode.annotations = {};
      }
      each(groupNames, function (groupName) {
        var targetGroup = targetAnnotations[groupName];
        if ( !targetGroup ) {
          targetGroup = targetAnnotations[groupName] = {};
        }
        mixin(targetGroup, annotations[groupName]);
      });

      each(targetNode, function (subNode) {
        if ( !isArray(subNode) ) {
          if ( !isStatements(subNode) ) {
            return;
          }
          subNode = subNode.stmts;
        }
        if ( matcher && !matcher(subNode) ) {
          return;
        }
        visitChildren(subNode);
      });
    }
  }

  // Step into the tree, identifying all scope boundaries (partials, loops)
  // that contain context mutations.  The root of these boundaries will be
  // annotated with a list of mutated values.
  function annotateMutations(node) {
    var op = hasOperator(node, ['as', 'de', 'fr', 'us', 'ux']);
    if ( !op ) {
      return node;
    }

    if ( op === 'as' ) {
      each(node[1], function (assignment) {
        addAnnotation('mutations', assignment[0].value, true);
      });
    }
    else {
      anchorAnnotationsDownTree(
        node,
        ['mutations'],
        not(matchOps(['de', 'fr', 'us', 'ux']))
      );
    }

    return node;
  }

  // We can roll up a single nested for loop into a containing for
  // loop so that they share the same context
  function rollUpForLoops(statements) {
    return mapNodes(statements, matcher, processStatement);

    function matcher(statement) {
      return hasOperator(statement, 'fr') &&        // is a for loop
             statement[2].length === 1 &&           // one child
             hasOperator(statement[2][0], 'fr') &&  // nested for loop
             !statement[3] && !statement[2][0][3];  // no elses
    }

    function processStatement(statement) {
      var forStatements = statement[2];
      var nested = forStatements[0];

      statement[1] = statement[1].concat(nested[1]);
      statement[2] = nested[2];
      return statement;
    }
  }

  // Or, And, Conditional Folding
  function foldShortCircuits(node) {
    var op = hasOperator(node, shortCircuitFolderKeys);
    if ( !op || !isLiteral(node[1]) ) {
      return node;
    }
    var args = node.slice(1);
    return shortCircuitFolders[op].apply(null, args);
  }
  
  // Simple constant folding
  function foldConstants(node) {
    var op = hasOperator(node, constantFolderKeys);
    if ( !op ) {
      return node;
    }
    var args = [];
    for ( var i = 1, len = node.length; i < len; i++ ) {
      var arg = node[i];
      if ( !isLiteral(arg) ) {
        return node;
      }
      args.push(arg.value);
    }
    var output = constantFolders[op].apply(null, args);
    return sym(output, 'lit', node[0]);
  }
  
  // If the condition is 'not' we can roll up its argument
  // and flip the branches.
  function flipConditionals(node) {
    if ( !hasOperator(node, ['cn', 'if']) ) {
      return node;
    }
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
    if ( !hasOperator(node, 'no') ) {
      return node;
    }

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
    var op = hasOperator(node, ['an', 'or']);
    if ( !op ) {
      return node;
    }

    var left = node[1];
    var leftOp = hasOperator(left, 'no');
    var right = node[2];
    var rightOp = hasOperator(right, 'no');

    if ( !leftOp || !rightOp ) {
      return node;
    }

    var newOp = op === 'an' && 'or' || 'an';
    return [ sym('no', left), [sym(newOp, node), left[1], right[1]] ];
  }

  // If all the elements of an Array are literals, then we can convert
  // the list to a literal array for the literal table
  function literalFromArray(node) {
    if ( !hasOperator(node, 'ar') ) {
      return node;
    }
    var elements = node[1];
    var output = [];

    each(elements, function (element) {
      if ( !isLiteral(element) ) {
        return node;
      }
      output.push(element.value);
    });

    return sym(output, 'lit', node[0]);
  }

  // If all the elements of a Dictionary are literals, then we can
  // convert the list to a literal object for the literal table
  function literalFromDictionary(node) {
    if ( !hasOperator(node, 'dc') ) {
      return node;
    }
    var elements = node[1];
    var output = {};

    each(elements, function(element) {
      var name = element[0];
      var value = element[1];
      if ( (!isIdentifier(name) && !isLiteral(name)) || !isLiteral(value) ) {
        return node;
      }
      output[name.value] = value.value;
    });

    return sym(output, 'lit', node[0]);
  }

  // If the left side is a literal string and the right is a 'self' reference
  // (or if piped operations are used) then we can optimize the formatting to
  // use a constructed dictionary.  Depending on the depth, the cost of
  // performing this optimization in order to avoid scope nesting may be too
  // high to justify
  function selfFormatFromDictionary(node) {
    if ( !hasOperator(node, 'fm') ) {
      return node;
    }

    var left = node[1];
    if ( !(isLiteral(left) || isAutoInterpolated(left)) ) {
      node[3] = [sym('se')];
      return node;
    }

    var formatter = buildFormatter(left.value);
    var requiredFunctions = formatter.__intRequiredFunctions || [];
    if ( requiredFunctions.length ) {
      // build a dictionary from the names
      var supportFuncElems = map(requiredFunctions, function (funcName) {
        return [
          sym(funcName, 'id'),
          [sym('id'), sym(funcName, 'lit')]
        ];
      });
      node[3] = [sym('dc'), supportFuncElems];
    }

    // if it's pulling from self, we can optimize that as well
    if ( !hasOperator(node[2], 'se') ) {
      return node;
    }

    var requiredIndexes = formatter.__intRequiredIndexes || [];
    if ( !requiredIndexes.length ) {
      // Huh?  Issue a warning!
      issueWarning(node[0],
        "Attempt to perform interpolation against string with no escaping"
      );
      return node;
    }

    var varNameElems = map(requiredIndexes, function (varName) {
      return [
        sym(varName, 'id'),
        [sym('id'), sym(varName, 'lit')]
      ];
    });

    node[2] = [sym('dc'), varNameElems];
    return node;
  }

  function annotateSelfReferences(node) {
    if ( hasOperator(node, ['se', 'us', 'ux']) ) {
      addAnnotation('self', 'read', true);
      anchorAnnotationsUpTree(node, ['self']);
    }
    return node;
  }

  function rollUpStatements(node) {
    return rewriteNodes(node, isStatements, function (node) {
      return node.stmts;
    });
  }

  function issueWarning(source, message) {
    warnings.push({
      line: source.line,
      column: source.column,
      message: message
    });
  }
}

// Iterates over a set of nodes and presents matching nodes to the callback
// for replacement
function mapNodes(nodes, matcher, callback) {
  return map(nodes, function (node) {
    var match = matcher(node);
    if ( match ) {
      return callback(node, match);
    }
    return node;
  });
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
        var content = escapeAttribute(stringify(val));
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
