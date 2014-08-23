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

    test.equal(evaluate(script1, data), 
      '<htmlBody (attrName)=\"aValue\" litAttr=\"attr\">\n</htmlBody>');
    
    test.equal(evaluate(script2, data), 
      '<!DOCTYPE any>\n<start>someAttr</start>');
    
    test.equal(evaluate(script3, data), '<aTag boolAttr>');
    
    test.equal(evaluate(script4, data), '<selfClosingTag />');
    
    test.done();
  }
});
