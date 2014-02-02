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

  var isArray = Array.isArray;
  if ( !isArray ) {
    isArray = function _isArray(obj) {
      return obj && obj.length && toString.call(obj) === '[object Array]';
    };
  }

  var extendContext = Object.create
    , toString = Object.prototype.toString
    , slice = Array.prototype.slice
    , splice = Array.prototype.splice
    , push = Array.prototype.push;

  function makeArray(arr) {
    return slice.call(arr, 0);
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
    var Evaluators = {
      'stmts':   createStatementsEvaluator,
      'def':     createFunctionEvaluator,
      'call':    createCallEvaluator,
      'open':    createOpenTagEvaluator,
      'close':   createCloseTagEvaluator,
      'sclose':  createSelfClosingTagEvaluator,
      'comment': createCommentTagEvaluator,
      'output':  createOutputEvaluator,
      'for':     createForEvaluator,
      'fmt':     createFormatEvaluator,
      'tuple':   createTupleEvaluator
    };

    var evaluator = wrapEvaluator(parseTree);

    return compiledTemplate;

    function compiledTemplate(ctx) {
      var content = [];
      evaluator(ctx, output);
      return content.join('');

      function output() {
        push.apply(content, arguments);
      }
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

    function wrapEvaluatorArray(arr) {
      var result = [];
      for ( var i = arr.length; i--; ) {
        result[i] = wrapEvaluator(arr[i]);
      }
      return result;
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
      var statements = wrapEvaluatorArray(statementNodes).reverse()
        , slen = statements.length;

      return statementsEvaluator;

      function statementsEvaluator(ctx, output) {
        var result = null;
        for ( var i = slen; i--; ) {
          result = statements[i](ctx, output);
        }
        return result;
      }
    }

    function createFunctionEvaluator(name, paramNodes, statementNodes) {
      var params = wrapEvaluatorArray(paramNodes)
        , plen = params.length
        , statements = createEvaluator(statementNodes);

      return closureEvaluator;

      function closureEvaluator(ctx, output) {
        ctx[name] = bodyEvaluator;
        bodyEvaluator._isInterpolFunction = true;

        function bodyEvaluator() {
          var newCtx = extendContext(ctx);
          for ( var i = 0; i < plen; i++ ) {
            newCtx[params[i]] = arguments[i];
          }
          return statements(newCtx, output);
        }
      }
    }

    function createCallEvaluator(name, argNodes) {
      var args = wrapEvaluatorArray(argNodes)
        , alen = args.length;

      return callEvaluator;

      function callEvaluator(ctx, output) {
        var func = ctx[name];
        if ( typeof func !== 'function' || !func._isInterpolFunction ) {
          throw new Error("'" + name + "' is not a function");
        }
        var appliedArgs = [];
        for ( var i = 0; i < alen; i++ ) {
          appliedArgs[i] = args[i](ctx, output);
        }
        func.apply(null, appliedArgs);
      }
    }

    // TODO: createOpenTagEvaluator
    // TODO: createCloseTagEvaluator
    // TODO: createSelfClosingTagEvaluator
    // TODO: createCommentTagEvaluator

    function createOutputEvaluator(exprNode) {
      var $1 = createEvaluator(exprNode)
        , $1_func = typeof $1 === 'function';

      return $1_func ? outputEvaluator : outputLiteral;

      function outputEvaluator(ctx, output) {
        output($1(ctx, output));
      }

      function outputLiteral(ctx, output) {
        output($1);
      }
    }

    // TODO: createForEvaluator

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

      function formatEvaluator(ctx, output) {
        if ( template ) {
          return template($2_func ? $2(ctx, output) : $2);
        }

        var formatStr = $1_func ? $1(ctx, output) : $1
          , data = $2_func ? $2(ctx, output) : $2;

        return buildTemplate(formatStr)(data);
      }

      function buildTemplate(formatStr) {
        // TODO: This
      }
    }

    function createTupleEvaluator(elemNodes) {
      var elems = wrapEvaluatorArray(elemNodes)
        , elen = elems.length;

      return tupleEvaluator;

      function tupleEvaluator(ctx, output) {
        var result = [];
        for ( var i = 0; i < elen; i++ ) {
          result[i] = elems[i](ctx, output);
        }
        return result;
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
  interpol.parser = parser;
  interpol.parse = parse;
  interpol.compile = compile;

})(typeof require === 'function' ? require('./parser') : null,
   typeof module === 'object' ? module : this,
   typeof module === 'object' ? 'exports' : '$interpol');
