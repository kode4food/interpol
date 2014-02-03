/*!
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (parser, exportTarget, exportName) {
  "use strict";

  var CURRENT_VERSION = "0.0.1";

  // Utilities ****************************************************************

  var toString = Object.prototype.toString;

  var extendContext = Object.create;
  if ( !extendContext ) {
    extendContext = (function () {
      function FakeConstructor() {}

      return function _extendContext(obj) {
        FakeConstructor.prototype = obj;
        return new FakeConstructor()
      }
    })();
  }

  var isArray = Array.isArray;
  if ( !isArray ) {
    isArray = (function () {
      return function _isArray(obj) {
        return obj && obj.length && toString.call(obj) === '[object Array]';
      };
    })();
  }

  var freezeObject = Object.freeze;
  if ( !freezeObject ) {
    freezeObject = (function () {
      return function _freezeObject(obj) {
        return obj;
      };
    })();
  }

  function createArrayWriter(arr) {
    return freezeObject({
      startElement: startElement,
      selfCloseElement: selfCloseElement,
      endElement: endElement,
      comment: comment,
      content: content
    });

    function writeAttributes(attributes) {
      // TODO: Properly Escape This
      for ( var key in attributes ) {
        arr.push(" ", key, "=\"", attributes[key], "\"");
      }
    }

    function startElement(tagName, attributes) {
      arr.push("<", tagName);
      writeAttributes(attributes);
      arr.push(">");
    }

    function selfCloseElement(tagName, attributes) {
      arr.push("<", tagName);
      writeAttributes(attributes);
      arr.push(" />");
    }

    function endElement(tagName) {
      arr.push("</", tagName, ">");
    }

    function comment(content) {
      arr.push("<!--", content, "-->");
    }

    function content() {
      // TODO: Properly Escape This
      arr.push.apply(arr, arguments);
    }
  }

  // Implementation ***********************************************************

  function interpol(template) {
    return compile(parse(template));
  }

  function parse(template) {
    if ( !parser ) {
      if ( typeof interpol.parser !== 'function' ) {
        throw new Error("The interpol parser was never loaded");
      }
      parser = interpol.parser;
    }
    return parser.parse(template);
  }

  function compile(parseTree) {
    var Evaluators = freezeObject({
      'stmts':   createStatementsEvaluator,
      'def':     createFunctionEvaluator,
      'call':    createCallEvaluator,
      'open':    createOpenTagEvaluator,
      'close':   createCloseTagEvaluator,
      'comment': createCommentTagEvaluator,
      'output':  createOutputEvaluator,
      'for':     createForEvaluator,
      'cond':    createConditionalEvaluator,
      'or':      createOrEvaluator,
      'and':     createAndEvaluator,
      'eq':      createEqEvaluator,
      'neq':     createNeqEvaluator,
      'gt':      createGtEvaluator,
      'lt':      createLtEvaluator,
      'gte':     createGteEvaluator,
      'lte':     createLteEvaluator,
      'add':     createAddEvaluator,
      'sub':     createSubEvaluator,
      'mul':     createMulEvaluator,
      'div':     createDivEvaluator,
      'mod':     createModEvaluator,
      'fmt':     createFormatEvaluator,
      'not':     createNotEvaluator,
      'neg':     createNegEvaluator,
      'member':  createMemberEvaluator,
      'tuple':   createTupleEvaluator,
      'id':      createIdEvaluator
    });

    var evaluator = wrapEvaluator(parseTree);

    return compiledTemplate;

    function compiledTemplate(ctx, options) {
      options = options || { writer: null, errorCallback: null};
      var writer = options.writer
        , content = null;

      if ( !writer ) {
        content = [];
        writer = createArrayWriter(content);
      }

      try {
        evaluator(ctx, writer);
      }
      catch ( err ) {
        if ( typeof options.errorCallback === 'function' ) {
          options.errorCallback(err, null);
          return;
        }
        // Re-raise if no callback
        throw err;
      }

      return content ? content.join('') : null;
    }

    function wrapEvaluator(node) {
      var result = createEvaluator(node);
      if ( typeof result === 'function' ) {
        return result;
      }
      return evalWrapper;

      function evalWrapper() {
        return result;
      }
    }

    function wrapArrayEvaluators(arrayNodes) {
      var result = [];
      for ( var i = arrayNodes.length; i--; ) {
        result[i] = wrapEvaluator(arrayNodes[i]);
      }
      return result;
    }

    function wrapKeyValueEvaluators(keyValueNodes) {
      var pairs = [];
      for ( var i = 0, len = keyValueNodes.length; i < len; i++ ) {
        var keyValueNode = keyValueNodes[i];
        pairs.push([keyValueNode[0], wrapEvaluator(keyValueNode[1])]);
      }
      return pairs;
    }

    function createEvaluator(node) {
      if ( !isArray(node) ) {
        return node;
      }

      var nodeType = node[0]
        , createFunction = Evaluators[nodeType];

      if ( !createFunction ) {
        throw new Error("Invalid Node in Parse Tree: " + nodeType);
      }

      return createFunction.apply(node, node.slice(1));
    }

    // Evaluators *************************************************************

    function createStatementsEvaluator(statementNodes) {
      var statements = wrapArrayEvaluators(statementNodes).reverse()
        , slen = statements.length;

      return statementsEvaluator;

      function statementsEvaluator(ctx, writer) {
        var result = null;
        for ( var i = slen; i--; ) {
          result = statements[i](ctx, writer);
        }
        return result;
      }
    }

    function createFunctionEvaluator(name, params, statementsNode) {
      var plen = params.length
        , statements = createEvaluator(statementsNode);

      return closureEvaluator;

      function closureEvaluator(ctx, writer) {
        ctx[name] = bodyEvaluator;
        bodyEvaluator._isInterpolFunction = true;

        function bodyEvaluator() {
          var newCtx = extendContext(ctx);
          for ( var i = 0; i < plen; i++ ) {
            newCtx[params[i]] = arguments[i];
          }
          return statements(newCtx, writer);
        }
      }
    }

    function createCallEvaluator(name, argNodes) {
      var args = createEvaluator(argNodes);

      return callEvaluator;

      function callEvaluator(ctx, writer) {
        var func = ctx[name];
        if ( typeof func !== 'function' || !func._isInterpolFunction ) {
          throw new Error("'" + name + "' is not a function");
        }
        return func.apply(null, args(ctx, writer));
      }
    }

    function createOpenTagEvaluator(name, attributeNodes, selfClose) {
      var attributes = wrapKeyValueEvaluators(attributeNodes).reverse()
        , alen = attributes.length;

      return selfClose ? selfCloseTagEvaluator : openTagEvaluator;

      function selfCloseTagEvaluator(ctx, writer) {
        writer.selfCloseElement(name, getAttributes(ctx, writer));
      }

      function openTagEvaluator(ctx, writer) {
        writer.startElement(name, getAttributes(ctx, writer));
      }

      function getAttributes(ctx, writer) {
        var result = {};
        for ( var i = alen; i--; ) {
          var attribute = attributes[i];
          result[attribute[0]] = attribute[1](ctx, writer);
        }
        return freezeObject(result);
      }
    }

    function createCloseTagEvaluator(name) {
      return closeTagEvaluator;

      function closeTagEvaluator(ctx, writer) {
        writer.endElement(name);
      }
    }

    function createCommentTagEvaluator(content) {
      return commentTagEvaluator;

      function commentTagEvaluator(ctx, writer) {
        writer.comment(content);
      }
    }

    function createOutputEvaluator(exprNode) {
      var $1 = createEvaluator(exprNode)
        , $1_func = typeof $1 === 'function';

      return $1_func ? outputEvaluator : outputLiteral;

      function outputEvaluator(ctx, writer) {
        writer.content($1(ctx, writer));
      }

      function outputLiteral(ctx, writer) {
        writer.content($1);
      }
    }

    function createForEvaluator(rangeNodes, statementsNode) {
      var ranges = wrapKeyValueEvaluators(rangeNodes).reverse()
        , rlen = ranges.length
        , statements = createEvaluator(statementsNode);

      return forEvaluator;

      function forEvaluator(ctx, writer) {
        processRange(ctx, rlen - 1);
        return null;

        function processRange(parentCtx, idx) {
          var range = ranges[idx]
            , name = range[0]
            , collection = range[1](parentCtx, writer)
            , newCtx = extendContext(parentCtx);

          for ( var i = 0, len = collection.length; i < len; i++ ) {
            newCtx[name] = collection[i];
            if ( idx ) {
              processRange(newCtx, idx - 1);
            }
            else {
              statements(newCtx, writer);
            }
          }
        }
      }
    }

    function createConditionalEvaluator(conditionNode, trueNode, falseNode) {
      var $1 = createEvaluator(conditionNode)
        , $2 = createEvaluator(trueNode)
        , $3 = createEvaluator(falseNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function'
        , $3_func = typeof $3 === 'function';

      return $1_func || $2_func || $3_func ? ternEvaluator : ternEvaluator();

      function ternEvaluator(ctx, writer) {
        var cval = $1_func ? $1(ctx, writer) : $1;
        if ( cval ) {
          return $2_func ? $2(ctx, writer) : $2;
        }
        return $3_func ? $3(ctx, writer) : $3;
      }
    }

    function createOrEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? orEvaluator : orEvaluator();

      function orEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1;
        if ( lval ) {
          return lval;
        }
        return $2_func ? $2(ctx, writer) : $2;
      }
    }

    function createAndEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? andEvaluator : andEvaluator();

      function andEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1;
        if ( !lval ) {
          return lval;
        }
        return $2_func ? $2(ctx, writer) : $2;
      }
    }

    function createEqEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? eqEvaluator : eqEvaluator();

      function eqEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval == rval;
      }
    }

    function createNeqEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? neqEvaluator : neqEvaluator();

      function neqEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval != rval;
      }
    }

    function createGtEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? gtEvaluator : gtEvaluator();

      function gtEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval > rval;
      }
    }

    function createGteEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? gteEvaluator : gteEvaluator();

      function gteEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval >= rval;
      }
    }

    function createLtEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? ltEvaluator : ltEvaluator();

      function ltEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval < rval;
      }
    }

    function createLteEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? lteEvaluator : lteEvaluator();

      function lteEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval <= rval;
      }
    }

    function createAddEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? addEvaluator : addEvaluator();

      function addEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval + rval;
      }
    }

    function createSubEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? subEvaluator : subEvaluator();

      function subEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval - rval;
      }
    }

    function createMulEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? mulEvaluator : mulEvaluator();

      function mulEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval * rval;
      }
    }

    function createDivEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? divEvaluator : divEvaluator();

      function divEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval / rval;
      }
    }

    function createModEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , $1_func = typeof $1 === 'function'
        , $2_func = typeof $2 === 'function';

      return $1_func || $2_func ? modEvaluator : modEvaluator();

      function modEvaluator(ctx, writer) {
        var lval = $1_func ? $1(ctx, writer) : $1
          , rval = $2_func ? $2(ctx, writer) : $2;
        return lval % rval;
      }
    }

    function createFormatEvaluator(formatNode, exprNode) {
      var $1 = createEvaluator(formatNode)
        , $1_func = typeof $1 === 'function'
        , $2 = createEvaluator(exprNode)
        , $2_func = typeof $2 === 'function';

      var template = null;
      if ( !$1_func ) {
        template = buildTemplate($1);
        if ( !$2_func ) {
          return template($2);
        }
      }

      return formatEvaluator;

      function formatEvaluator(ctx, writer) {
        if ( template ) {
          return template($2_func ? $2(ctx, writer) : $2);
        }

        var formatStr = $1_func ? $1(ctx, writer) : $1
          , data = $2_func ? $2(ctx, writer) : $2;

        return buildTemplate(formatStr)(data);
      }

      function buildTemplate(formatStr) {
        var funcs = []
          , flen = 0
          , idx = 0
          , tmp = [];

        for ( var i = 0, len = formatStr.length; i < len; i++ ) {
          var c = formatStr.charAt(i);
          if ( c === '%' ) {
            if ( tmp.length ) {
              funcs.push(createLiteralFunction(tmp.join('')));
              tmp.length = 0;
            }
            funcs.push(createIndexedFunction(idx++));
          }
          else {
            tmp.push(c);
          }
        }
        if ( tmp.length ) {
          funcs.push(createLiteralFunction(tmp.join('')));
        }
        flen = funcs.length;

        return templateFunction;

        function templateFunction(data) {
          if ( !isArray(data) ) {
            data = [data];
          }

          var output = [];
          for ( var i = 0; i < flen; i++ ) {
            output[i] = funcs[i](data);
          }

          return output.join('');
        }

        function createLiteralFunction(literal) {
          return literalFunction;

          function literalFunction() {
            return literal;
          }
        }

        function createIndexedFunction(idx) {
          return indexedFunction;

          function indexedFunction(data) {
            return data[idx];
          }
        }
      }
    }

    function createNotEvaluator(node) {
      var $1 = createEvaluator(node);
      return typeof $1 === 'function' ? notEvaluator : !$1;

      function notEvaluator(ctx, writer) {
        return !$1(ctx, writer);
      }
    }

    function createNegEvaluator(node) {
      var $1 = createEvaluator(node);
      return typeof $1 === 'function' ? negEvaluator : -$1;

      function negEvaluator(ctx, writer) {
        return -$1(ctx, writer);
      }
    }

    function createMemberEvaluator(parentNode, elemNode) {
      var $1 = createEvaluator(parentNode)
        , $1_func = typeof $1 === 'function'
        , $2 = createEvaluator(elemNode)
        , $2_func = typeof $2 === 'function';

      return pathEvaluator;

      function pathEvaluator(ctx, writer) {
        var parent = $1_func ? $1(ctx, writer) : $1;

        if ( !parent ) {
          return null;
        }

        var expr = $2_func ? $2(ctx, writer) : $2;
        return parent[expr];
      }
    }

    function createTupleEvaluator(elemNodes) {
      var elems = wrapArrayEvaluators(elemNodes)
        , elen = elems.length;

      return tupleEvaluator;

      function tupleEvaluator(ctx, writer) {
        var result = [];
        for ( var i = 0; i < elen; i++ ) {
          result[i] = elems[i](ctx, writer);
        }
        return result;
      }
    }

    function createIdEvaluator(name) {
      return idEvaluator;

      function idEvaluator(ctx, writer) {
        return ctx[name];
      }
    }
  }

  // Bootstrap ****************************************************************

  var exported = exportTarget[exportName];
  // if it's an object, then it was probably created by a browser parser load
  if ( typeof exported === 'object' ) {
    if ( !parser && typeof exported.parser === 'function' ) {
      parser = exported.parser;
    }
    exportTarget[exportName] = interpol;
  }

  interpol.VERSION = CURRENT_VERSION;
  interpol.parser = parser;
  interpol.parse = parse;
  interpol.compile = compile;

})(typeof require === 'function' ? require('./parser') : null,
   typeof module === 'object' ? module : this,
   typeof module === 'object' ? 'exports' : '$interpol');
