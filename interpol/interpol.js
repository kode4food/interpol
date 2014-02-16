/*!
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (parser, exportTarget, exportName) {
  "use strict";

  var CURRENT_VERSION = "0.1.2"
    , TemplateCacheMax = 256
    , TemplateParamRegex = /%([1-9][0-9]*)?/
    , globalOptions = { writer: null, errorCallback: null }
    , globalContext = {};

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

  function mixin(target) {
    for ( var i = 1, len = arguments.length; i < len; i++ ) {
      var src = arguments[i];
      for ( var key in src ) {
        if ( !src.hasOwnProperty(key) ) {
          continue;
        }
        target[key] = src[key];
      }
    }
    return target;
  }

  function noOp() {}

  // String Handling **********************************************************

  // TODO: Need to handle complex types like Dates
  function stringify(obj) {
    var type = typeof obj;
    switch ( type ) {
      case 'string':    return obj;
      case 'number':    return obj.toString();
      case 'boolean':   return obj ? 'true' : 'false';
      case 'undefined': return '';
      case 'object':    return obj !== null ? obj.toString() : '';
      case 'xml':       return obj.toXMLString();
      default:          return '';
    }
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

  // Interpolation Template Builder *******************************************

  function buildTemplate(formatStr) {
    var funcs = []
      , flen = 0
      , autoIdx = 0;

    while ( formatStr && formatStr.length ) {
      var paramMatch = TemplateParamRegex.exec(formatStr);
      if ( !paramMatch ) {
        funcs.push(createLiteralFunction(formatStr));
        break;
      }

      var matchIdx = paramMatch.index
        , match = paramMatch[0]
        , matchLen = match.length;

      if ( matchIdx ) {
        funcs.push(createLiteralFunction(formatStr.substring(0, matchIdx)));
      }

      var idx = autoIdx++;
      if ( matchLen > 1 ) {
        idx = parseInt(match.substring(1), 10) - 1;
      }

      funcs.push(createIndexedFunction(idx));
      formatStr = formatStr.substring(matchIdx + matchLen);
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

  // Default Writer Implementations *******************************************

  var NullWriter = freezeObject({
    startElement: noOp,
    selfCloseElement: noOp,
    endElement: noOp,
    comment: noOp,
    content: noOp
  });

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

  // Core Interpol Implementation *********************************************

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
      im: createModuleEvaluator,
      de: createPartialEvaluator,
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
      , evaluator = wrapEvaluator(parseOutput.n)
      , exportedContext = null;

    compiledTemplate.exports = exports;
    return freezeObject(compiledTemplate);

    function compiledTemplate(obj, localOptions) {
      var ctx = mixin({}, globalContext, obj || {})
        , options = mixin({}, globalOptions, localOptions || {});

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

    function exports() {
      if ( exportedContext ) {
        return exportedContext;
      }
      exportedContext = mixin({}, globalContext);
      evaluator(exportedContext, NullWriter);
      return freezeObject(exportedContext);
    }
    
    // Evaluator Generation Utilities *****************************************

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

    function wrapAttributeEvaluators(keyValueNodes) {
      var pairs = [];
      for ( var i = 0, len = keyValueNodes.length; i < len; i++ ) {
        var keyValueNode = keyValueNodes[i];
        pairs.push([createEvaluator(keyValueNode[0]),
                    createEvaluator(keyValueNode[1])]);
      }
      return pairs;
    }

    function wrapRangeEvaluators(rangeNodes) {
      var pairs = [];
      for ( var i = 0, len = rangeNodes.length; i < len; i++ ) {
        var keyValueNode = rangeNodes[i];
        pairs.push([lits[keyValueNode[0]],
                    wrapEvaluator(keyValueNode[1])]);
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

    function createStatementsEvaluator(statementNodes) {
      if ( statementNodes.length === 1 ) {
        return createEvaluator(statementNodes[0]);
      }

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

    function getBinaryType(left, right) {
      var l = typeof left === 'function' ? 1 : 0
        , r = typeof right === 'function' ? 2 : 0;
      return l | r;
    }

    // Evaluator Generation ***************************************************

    function createModuleEvaluator(statementNodes) {
      return createStatementsEvaluator(statementNodes);
    }

    function createPartialEvaluator(nameLiteral, paramDefs, statementNodes) {
      var name = lits[nameLiteral]
        , params = [null].concat(expandLiterals(paramDefs))
        , plen = params.length
        , statements = createStatementsEvaluator(statementNodes);

      return closureEvaluator;

      function closureEvaluator(ctx /*, writer */) {
        bodyEvaluator._isInterpolFunction = true;
        ctx[name] = bodyEvaluator;

        function bodyEvaluator(writer) {
          var newCtx = extendContext(ctx);
          for ( var i = 1; i < plen; i++ ) {
            newCtx[params[i]] = arguments[i];
          }
          return statements(newCtx, writer);
        }
      }
    }

    function createCallEvaluator(nameLiteral, argNodes) {
      var name = lits[nameLiteral]
        , args = [null].concat(wrapArrayEvaluators(argNodes))
        , alen = args.length;

      return callEvaluator;

      function callEvaluator(ctx, writer) {
        var func = ctx[name];
        if ( typeof func !== 'function' || !func._isInterpolFunction ) {
          throw new Error("'" + name + "' is not a valid function");
        }

        var callArgs = [writer];
        for ( var i = 1; i < alen; i++ ) {
          callArgs[i] = args[i](ctx, writer);
        }

        return func.apply(null, callArgs);
      }
    }

    function createOpenTagEvaluator(nameNode, attributeDefs, selfClose) {
      var name = createEvaluator(nameNode)
        , attributes = wrapAttributeEvaluators(attributeDefs).reverse()
        , alen = attributes.length;

      if ( typeof name === 'function' ) {
        return selfClose ? selfCloseFuncEvaluator : openTagFuncEvaluator;
      }
      return selfClose ? selfCloseLiteralEvaluator : openTagLiteralEvaluator;

      function selfCloseFuncEvaluator(ctx, writer) {
        var tagName = stringify(name(ctx, writer));
        writer.selfCloseElement(tagName, getAttributes(ctx, writer));
      }

      function openTagFuncEvaluator(ctx, writer) {
        var tagName = stringify(name(ctx, writer));
        writer.startElement(tagName, getAttributes(ctx, writer));
      }

      function selfCloseLiteralEvaluator(ctx, writer) {
        writer.selfCloseElement(name, getAttributes(ctx, writer));
      }

      function openTagLiteralEvaluator(ctx, writer) {
        writer.startElement(name, getAttributes(ctx, writer));
      }

      function getAttributes(ctx, writer) {
        var result = {};
        for ( var i = alen; i--; ) {
          var attribute = attributes[i]
            , key = attribute[0];

          if ( typeof key === 'function' ) {
            key = key(ctx, writer);
            if ( typeof key === 'undefined' || key === null ) {
              continue;
            }
            key = stringify(key);
          }

          var val = attribute[1];
          if ( typeof val === 'function' ) {
            val = val(ctx, writer);
          }
          result[key] = stringify(val);
        }
        return freezeObject(result);
      }
    }

    function createCloseTagEvaluator(nameNode) {
      var name = createEvaluator(nameNode)
        , name_func = typeof name === 'function';

      return name_func ? closeFuncEvaluator : closeLiteralEvaluator;

      function closeFuncEvaluator(ctx, writer) {
        writer.endElement(stringify(name(ctx, writer)));
      }

      function closeLiteralEvaluator(ctx, writer) {
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
      var $1 = createEvaluator(exprNode);

      if ( typeof $1 !== 'function' ) {
        $1 = stringify($1);
        return outputLiteral;
      }
      return outputEvaluator;

      function outputEvaluator(ctx, writer) {
        writer.content(stringify($1(ctx, writer)));
      }

      function outputLiteral(ctx, writer) {
        writer.content($1);
      }
    }

    function createForEvaluator(rangeNodes, statementNodes) {
      var ranges = wrapRangeEvaluators(rangeNodes).reverse()
        , rlen = ranges.length
        , statements = createStatementsEvaluator(statementNodes);

      return forEvaluator;

      function forEvaluator(ctx, writer) {
        var newCtx = extendContext(ctx);
        processRange(rlen - 1);

        function processRange(idx) {
          var range = ranges[idx]
            , name = range[0]
            , collection = range[1](newCtx, writer);

          if ( !isArray(collection) ) {
            // TODO: Since we have conditionals, should we be bothering to
            // coerce the value to display it once?
            if ( typeof collection === 'undefined' || collection === null ) {
              return;
            }
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

    function createConditionalEvaluator(conditionNode, trueNodes, falseNodes) {
      var $1 = createEvaluator(conditionNode)
        , $2 = createStatementsEvaluator(trueNodes)
        , $3 = createStatementsEvaluator(falseNodes);

      if ( typeof $1 !== 'function' ) {
        return $1 ? $2 : $3;
      }

      var type = getBinaryType($2, $3);
      return [condLiteral, condTrue, condFalse, condBoth][type];

      function condLiteral(c, w) { return $1(c, w) ? $2 : $3; }
      function condTrue(c, w) { return $1(c, w) ? $2(c, w) : $3; }
      function condFalse(c, w) { return $1(c, w) ? $2 : $3(c, w); }
      function condBoth(c, w) { return $1(c, w) ? $2(c, w) : $3(c, w); }
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

      if ( typeof $1 !== 'function' ) {
        return $1 && $2;
      }

      return typeof $2 === 'function' ? andFuncEvaluator : andLiteralEvaluator;

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
        , type = getBinaryType($1, $2);

       return [null, eqLeft, eqRight, eqBoth][type] || ($1 == $2);

      function eqLeft(c, w) { return $1(c, w) == $2; }
      function eqRight(c, w) { return $1 == $2(c, w); }
      function eqBoth(c, w) { return $1(c, w) == $2(c, w); }
    }

    function createNeqEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, neqLeft, neqRight, neqBoth][type] || ($1 != $2);

      function neqLeft(c, w) { return $1(c, w) != $2; }
      function neqRight(c, w) { return $1 != $2(c, w); }
      function neqBoth(c, w) { return $1(c, w) != $2(c, w); }
    }

    function createGtEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, gtLeft, gtRight, gtBoth][type] || ($1 > $2);

      function gtLeft(c, w) { return $1(c, w) > $2; }
      function gtRight(c, w) { return $1 > $2(c, w); }
      function gtBoth(c, w) { return $1(c, w) > $2(c, w); }
    }

    function createGteEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, gteLeft, gteRight, gteBoth][type] || ($1 >= $2);

      function gteLeft(c, w) { return $1(c, w) >= $2; }
      function gteRight(c, w) { return $1 >= $2(c, w); }
      function gteBoth(c, w) { return $1(c, w) >= $2(c, w); }
    }

    function createLtEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, ltLeft, ltRight, ltBoth][type] || ($1 < $2);

      function ltLeft(c, w) { return $1(c, w) < $2; }
      function ltRight(c, w) { return $1 < $2(c, w); }
      function ltBoth(c, w) { return $1(c, w) < $2(c, w); }
    }

    function createLteEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, lteLeft, lteRight, lteBoth][type] || ($1 <= $2);

      function lteLeft(c, w) { return $1(c, w) <= $2; }
      function lteRight(c, w) { return $1 <= $2(c, w); }
      function lteBoth(c, w) { return $1(c, w) <= $2(c, w); }
    }

    function createAddEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, addLeft, addRight, addBoth][type] || ($1 + $2);

      function addLeft(c, w) { return $1(c, w) + $2; }
      function addRight(c, w) { return $1 + $2(c, w); }
      function addBoth(c, w) { return $1(c, w) + $2(c, w); }
    }

    function createSubEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, subLeft, subRight, subBoth][type] || ($1 - $2);

      function subLeft(c, w) { return $1(c, w) - $2; }
      function subRight(c, w) { return $1 - $2(c, w); }
      function subBoth(c, w) { return $1(c, w) - $2(c, w); }
    }

    function createMulEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, mulLeft, mulRight, mulBoth][type] || ($1 * $2);

      function mulLeft(c, w) { return $1(c, w) * $2; }
      function mulRight(c, w) { return $1 * $2(c, w); }
      function mulBoth(c, w) { return $1(c, w) * $2(c, w); }
    }

    function createDivEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, divLeft, divRight, divBoth][type] || ($1 / $2);

      function divLeft(c, w) { return $1(c, w) / $2; }
      function divRight(c, w) { return $1 / $2(c, w); }
      function divBoth(c, w) { return $1(c, w) / $2(c, w); }
    }

    function createModEvaluator(leftNode, rightNode) {
      var $1 = createEvaluator(leftNode)
        , $2 = createEvaluator(rightNode)
        , type = getBinaryType($1, $2);

      return [null, modLeft, modRight, modBoth][type] || ($1 % $2);

      function modLeft(c, w) { return $1(c, w) % $2; }
      function modRight(c, w) { return $1 % $2(c, w); }
      function modBoth(c, w) { return $1(c, w) % $2(c, w); }
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
        , $2 = createEvaluator(elemNode)
        , type = getBinaryType($1, $2);

      if ( (type === 0 || type === 2) && typeof $1 !== 'object' ) {
        return null;
      }

      return [null, memLeft, memRight, memBoth][type] || ($1[$2]);

      function memLeft(c, w) {
        var parent = $1(c, w);
        return typeof parent === 'object' ? parent[$2] : null;
      }

      function memRight(c, w) {
        return $1[$2(c, w)];
      }

      function memBoth(c, w) {
        var parent = $1(c, w);
        return typeof parent === 'object' ? parent[$2(c, w)] : null;
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
  interpol.options = globalOptions;
  interpol.globals = globalContext;
  interpol.parse = parse;
  interpol.compile = compile;
  return freezeObject(interpol);

})(typeof require === 'function' ? require('./parser') : null,
   typeof module === 'object' ? module : this,
   typeof module === 'object' ? 'exports' : '$interpol');
