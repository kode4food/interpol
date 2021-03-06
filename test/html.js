/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.html = nodeunit.testCase({
  "Dynamic HTML Generation": function (test) {
    var data = {
      bodyTag: 'htmlBody',
      attrName: 'someAttr',
      attrValue: 'aValue',
      selfClosing: 'selfClosingTag',
      boolVal: true
    };
    
    var script1 = '<(bodyTag) (attrName)=attrValue litAttr="attr">\n' +
                  '</(bodyTag)>';
    
    var script2 = '<!DOCTYPE any>\n' +
                  '<start>attrName</start>';
    
    var script3 = '<aTag boolAttr=boolVal>';
    var script4 = '<(selfClosing) />';
    var script5 = '<tag attr="\'<>">';
    var script6 = '<tag>"str<>ing1" "s<>tring2"</tag>';

    var script7 = 'let a = ["dynamic", "strings", "added"]\n' +
                  '<tag attr="static %a">';

    var script8 = '<tag attr=true />';

    test.equal(evaluate(script1, data), '<htmlBody someAttr=\"aValue\" litAttr=\"attr\">\n</htmlBody>');
    test.equal(evaluate(script2, data), '<!DOCTYPE any>\n<start>someAttr</start>');
    test.equal(evaluate(script3, data), '<aTag boolAttr>');
    test.equal(evaluate(script4, data), '<selfClosingTag />');
    test.equal(evaluate(script5), '<tag attr=\"&#39;&lt;&gt;\">');
    test.equal(evaluate(script6), '<tag>str&lt;&gt;ing1 s&lt;&gt;tring2</tag>');
    test.equal(evaluate(script7), '<tag attr="static dynamic strings added">');
    test.equal(evaluate(script8), '<tag attr />');
    test.done();
  },

  "Mustache Handling": function (test) {
    var script1 = "{some mustache content}";
    var script2 = "{{some more content}}";
    var script3 = "{{{ even more content }}}";
    var script4 = "{ {this will pass the parser}";
    var err1 = "{ this will not} }";
    var err2 = "{{ nor will this } }}";

    test.equal(evaluate(script1), script1);
    test.equal(evaluate(script2), script2);
    test.equal(evaluate(script3), script3);
    test.equal(evaluate(script4), script4);
    test.throws(function () {
      evaluate(err1);
    });
    test.throws(function () {
      evaluate(err2);
    });
    test.done();
  }

});
