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
  var annotations = {};
  return rewrite(syntaxTree);

  function rewrite(node) {
    if ( !isArray(node) ) {
      if ( !isStatements(node) ) {
        return node;
      }
      var statements = rewrite(node.stmts);
      statements = foldIfStatements(statements);
      statements = hoistPartials(statements);
      statements = mergePartials(statements);
      statements = rollupForLoops(statements);
      statements = promoteRawLiteralOutput(statements);
      statements = convertLiteralHTML(statements);
      statements = mergeRawLiteralOutput(statements);
      statements = annotateMutations(statements);
      return statements;
    }

    selfMap(node, function(item) {
      return rewrite(item);
    });

    if ( hasOperator(node) ) {
      node = foldShortCircuits(node);
      node = foldConstants(node);
      node = flipConditionals(node);
      node = flipEquality(node);
      node = promoteNot(node);
      node = literalFromArray(node);
      node = literalFromDictionary(node);
      node = selfFormatFromDictionary(node);
      node = annotateSelfReferences(node);
    }
    return node;
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
    return matchGroups(statements, statementType('de'), processGroup);

    function processGroup(defStatements) {
      var namedDefs = {};
      each(defStatements, function (statement) {
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
    }

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

  // Convert literal output to pre-escaped raw output
  function promoteRawLiteralOutput(statements) {
    return matchStatements(statements, matcher, processStatement);

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
    return matchStatements(statements, matcher, processStatement);

    function matcher(statement) {
      return hasOperator(statement, ['op', 'cl', 'ct']);
    }

    function processStatement(statement) {
      var op = hasOperator(statement, ['op', 'cl', 'ct']);
      var tag = createTag[op](statement);
      return tag ? [sym('ra'), sym(tag, 'lit')] : statement;
    }
  }

  // We can combine sequences of raw literal output
  function mergeRawLiteralOutput(statements) {
    return matchGroups(statements, statementType('ra'), processGroup);

    function processGroup(raStatements) {
      var buffer = '';
      var result = [];

      each(raStatements, function (statement) {
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
  }

  function addAnnotation(group, name, value) {
    var groupObject = annotations[group];
    if ( !groupObject ) {
      annotations[group] = groupObject = {};
    }
    groupObject[name] = value;
  }

  function anchorAnnotations(statement, groupNames) {
    processAnnotations(statement, groupNames, true);
  }

  function stampAnnotations(statement, groupNames) {
    processAnnotations(statement, groupNames, false);
  }

  function processAnnotations(statement, groupNames, removeWorkingCopy) {
    var targetAnnotations = statement.annotations;
    if ( !targetAnnotations ) {
      statement.annotations = targetAnnotations = {};
    }
    if ( !groupNames ) {
      groupNames = objectKeys(annotations);
    }
    each(groupNames, function (groupName) {
      var targetGroup = targetAnnotations[groupName];
      if ( !targetGroup ) {
        targetGroup = targetAnnotations[groupName] = {};
      }
      mixin(targetGroup, annotations[groupName]);
      if ( removeWorkingCopy ) {
        delete annotations[groupName];
      }
    });
  }

  // Step into the tree, identifying all scope boundaries (partials, loops)
  // that contain context mutations.  The root of these boundaries will be
  // annotated with a list of mutated values.
  function annotateMutations(statements) {
    return matchStatements(statements, matcher, processStatement);

    function matcher(statement) {
      return hasOperator(statement, ['as', 'de', 'fr']);
    }

    function processStatement(statement) {
      if ( statement[0].value === 'as' ) {
        each(statement[1], function (assignment) {
          addAnnotation('mutations', assignment[0].value, true);
        });
      }
      else {
        anchorAnnotations(statement, ['mutations']);
        stampAnnotations(statement, ['self']);
      }
      return statement;
    }
  }

  // We can roll up a single nested for loop into a containing for
  // loop so that they share the same context
  function rollupForLoops(statements) {
    return matchStatements(statements, matcher, processStatement);

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
    if ( hasOperator(node, 'se') ) {
      addAnnotation('self', 'read', true)
    }
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

function statementType(op) {
  return matcher;

  function matcher(statement) {
    return hasOperator(statement, op);
  }
}

// Iterates over a set of statements and presents matching
// statements to the callback for replacement
function matchStatements(statements, matcher, callback) {
  return map(statements, function(statement) {
    if ( matcher(statement) ) {
      return callback(statement);
    }
    return statement;
  });
}

// Iterates over a set of statements and presents adjacent groups
// to the callback function for replacement
function matchGroups(statements, matcher, callback) {
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
    var result = group.length < 2 ?  group : callback(group);
    output = output.concat(result);
    group.length = 0;
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
