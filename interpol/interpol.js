/*!
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (parser, exportTarget, exportName) {
  "use strict";

  var CURRENT_VERSION = "0.1.0"
    , TemplateCacheMax = 256;

  // Utilities ****************************************************************

  var toString = Object.prototype.toString;

  var extendContext = Object.create;
  if ( !extendContext ) {
    extendContext = (function () {
      function FakeConstructor() {}

      return function _extendContext(obj) {
        FakeConstructor.prototype = obj;
        return new FakeConstructor();
      };
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

  var EscapeChars = freezeObject({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  });

  function escapeAttribute(str) {
    return str.replace(/[&<>'"]/gm, function(ch) {
      return EscapeChars[ch];
    });
  }

  function escapeContent(str) {
    return str.replace(/[&<>]/gm, function(ch) {
      return EscapeChars[ch];
    });
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
      for ( var key in attributes ) {
        arr.push(" ", key, "=\"", escapeAttribute(attributes[key]), "\"");
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
      for ( var i = 0, len = arguments.length; i < len; i++ ) {
        arr.push(escapeContent(arguments[i]));
      }
    }
  }

  // Implementation ***********************************************************

  function interpol(template) {
    var parseOutput = null;
    if ( typeof template === 'object' && template.i == 'interpol' ) {
      if ( !template.n || !template.l ) {
        throw new Error("Syntax elements missing from parse output");
      }
      parseOutput = template;
    }
    else {
      parseOutput = parse(template);
    }
    return compile(parseOutput);
  }

  function parse(template) {
    if ( !parser ) {
      if ( typeof interpol.parser !== 'function' ) {
        throw new Error("The interpol parser was never loaded");
      }
      parser = interpol.parser;
    }
    var result = parser.parse(template);
    result.v = CURRENT_VERSION;
    return result;
  }

  function compile(parseOutput) {
    var Evaluators = freezeObject({
      st: createStatementsEvaluator,
      de: createFunctionEvaluator,
      ca: createCallEvaluator,
      op: createOpenTagEvaluator,
      cl: createCloseTagEvaluator,
      ct: createCommentTagEvaluator,
      ou: createOutputEvaluator,
      fr: createForEvaluator,
      cn: createConditionalEvaluator,
      or: createOrEvaluator,
      an: createAndEvaluator,
      eq: createEqEvaluator,
      nq: createNeqEvaluator,
      gt: createGtEvaluator,
      lt: createLtEvaluator,
      ge: createGteEvaluator,
      le: createLteEvaluator,
      ad: createAddEvaluator,
      su: createSubEvaluator,
      mu: createMulEvaluator,
      di: createDivEvaluator,
      mo: createModEvaluator,
      fm: createFormatEvaluator,
      no: createNotEvaluator,
      ne: createNegEvaluator,
      mb: createMemberEvaluator,
      tu: createTupleEvaluator,
      id: createIdEvaluator
    });

    var lits = parseOutput.l
      , evaluator = wrapEvaluator(parseOutput.n);

    compiledTemplate._isInterpolFunction = true;
    return compiledTemplate;

    function compiledTemplate(obj, options) {
      obj = obj || {};
      options = options || { writer: null, errorCallback: null};

      var writer = options.writer
        , content = null;

      if ( !writer ) {
        content = [];
        writer = createArrayWriter(content);
      }

      try {
        evaluator(obj, writer);
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

    function expandLiterals(literalArray) {
      var result = [];
      for ( var i = literalArray.length; i--; ) {
        result[i] = lits[literalArray[i]];
      }
      return result;
    }

    function wrapKeyValueEvaluators(keyValueNodes) {
      var pairs = [];
      for ( var i = 0, len = keyValueNodes.length; i < len; i++ ) {
        var keyValueNode = keyValueNodes[i];
        pairs.push([lits[keyValueNode[0]], wrapEvaluator(keyValueNode[1])]);
      }
      return pairs;
    }

    function createEvaluator(node) {
      if ( !isArray(node) ) {
        return lits[node];
      }

      var nodeType = lits[node[0]]
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

    function createFunctionEvaluator(nameLiteral, paramDefs, statementsNode) {
      var name = lits[nameLiteral]
        , params = expandLiterals(paramDefs)
        , plen = params.length
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

    function createCallEvaluator(nameLiteral, argNodes) {
      var name = lits[nameLiteral]
        , args = createEvaluator(argNodes);

      return callEvaluator;

      function callEvaluator(ctx, writer) {
        var func = ctx[name];
        if ( typeof func !== 'function' || !func._isInterpolFunction ) {
          throw new Error("'" + name + "' is not a function");
        }
        return func.apply(null, args(ctx, writer));
      }
    }

    function createOpenTagEvaluator(nameLiteral, attributeDefs, selfClose) {
      var name = lits[nameLiteral]
        , attributes = wrapKeyValueEvaluators(attributeDefs).reverse()
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

    function createCloseTagEvaluator(nameLiteral) {
      var name = lits[nameLiteral];

      return closeTagEvaluator;

      function closeTagEvaluator(ctx, writer) {
        writer.endElement(name);
      }
    }

    function createCommentTagEvaluator(contentLiteral) {
      var content = lits[contentLiteral];

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
        var result = $1(ctx, writer);
        if ( typeof result !== 'undefined' ) {
          writer.content(result);
        }
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
        var newCtx = extendContext(ctx);
        processRange(rlen - 1);

        function processRange(idx) {
          var range = ranges[idx]
            , name = range[0]
            , collection = range[1](newCtx, writer);

          if ( !isArray(collection) ) {
            collection = [collection];
          }

          for ( var i = 0, len = collection.length; i < len; i++ ) {
            newCtx[name] = collection[i];
            if ( idx ) {
              processRange(idx - 1);
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
        , $2_func = typeof $2 === 'function'
        , $3_func = typeof $3 === 'function';

      if ( typeof $1 !== 'function' ) {
        return $1 ? $2 : $3;
      }
      else if ( $2_func && $3_func ) {
        return condBothEvaluator;
      }
      else if ( $2_func ) {
        return condTrueEvaluator;
      }
      else if ( $3_func ) {
        return condFalseEvaluator;
      }
      else {
        return condLiteralEvaluator;
      }

      function condBothEvaluator(ctx, writer) {
        return $1(ctx, writer) ? $2(ctx, writer) : $3(ctx, writer);
      }

      function condTrueEvaluator(ctx, writer) {
        return $1(ctx, writer) ? $2(ctx, writer) : $3;
      }

      function condFalseEvaluator(ctx, writer) {
        return $1(ctx, writer) ? $2 : $3(ctx, writer);
      }

      function condLiteralEvaluator(ctx, writer) {
        return $1(ctx, writer) ? $2 : $3;
      }
    }

    function createOrEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode);

      if ( typeof $1 !== 'function' ) {
        return $1 || $2;
      }

      return typeof $2 === 'function' ? orFuncEvaluator : orLiteralEvaluator;

      function orFuncEvaluator(ctx, writer) {
        var lval = $1(ctx, writer);
        return lval ? lval : $2(ctx, writer);
      }

      function orLiteralEvaluator(ctx, writer) {
        var lval = $1(ctx, writer);
        return lval ? lval : $2;
      }
    }

    function createAndEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode);

      if ( $1 !== 'function' ) {
        return $1 && $2;
      }

      return $2 === 'function' ? andFuncEvaluator : andLiteralEvaluator;

      function andFuncEvaluator(ctx, writer) {
        var lval = $1(ctx, writer);
        return lval ? $2(ctx, writer) : lval;
      }

      function andLiteralEvaluator(ctx, writer) {
        var lval = $1(ctx, writer);
        return lval ? $2 : lval;
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
        return builtFormatEvaluator;
      }

      var cache = {}
        , cacheCount = 0;

      return dynamicFormatEvaluator;

      function builtFormatEvaluator(ctx, writer) {
        return template($2(ctx, writer));
      }

      function dynamicFormatEvaluator(ctx, writer) {
        var formatStr = $1(ctx, writer)
          , data = $2_func ? $2(ctx, writer) : $2
          , dynamicTemplate = cache[formatStr];

        if ( !dynamicTemplate ) {
          if ( cacheCount >= TemplateCacheMax ) {
            // Something is clearly wrong here and we're not using this for
            // localized strings.  If we keep caching, we're going to start
            // leaking memory.  So blow away the cache and start over
            cache = {};
            cacheCount = 0;
          }
          dynamicTemplate = cache[formatStr] = buildTemplate(formatStr);
          cacheCount++;
        }

        return dynamicTemplate(data);
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

    function createIdEvaluator(nameLiteral) {
      var name = lits[nameLiteral];
      return idEvaluator;

      function idEvaluator(ctx, writer) {
        return ctx[name];
      }
    }
  }

  // Bootstrap ****************************************************************

  var exported = exportTarget[exportName];
  // if it's an object, then it was probably created by a browser parser load
  if ( !parser && typeof exported === 'object' ) {
    if ( typeof exported.parser === 'object' ) {
      parser = exported.parser;
    }
  }

  exportTarget[exportName] = interpol;
  interpol.VERSION = CURRENT_VERSION;
  interpol.parser = parser;
  interpol.parse = parse;
  interpol.compile = compile;

})(typeof require === 'function' ? require('./parser') : null,
   typeof module === 'object' ? module : this,
   typeof module === 'object' ? 'exports' : '$interpol');
