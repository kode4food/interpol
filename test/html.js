var nodeunit = require('nodeunit');
var interpol = require('../lib');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

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

    test.equal(eval(script1, data), 
      '<htmlBody (attrName)=\"aValue\" litAttr=\"attr\">\n</htmlBody>');
    
    test.equal(eval(script2, data), 
      '<!DOCTYPE any>\n<start>someAttr</start>');
    
    test.equal(eval(script3, data), '<aTag boolAttr>');
    
    test.equal(eval(script4, data), '<selfClosingTag />');
    
    test.done();
  }
});
