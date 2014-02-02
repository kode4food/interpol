var fs = require('fs')
  , util = require('util')
  , interpol = require('./../interpol');

var f = fs.readFileSync('./test.int').toString();
console.log("Input File");
console.log("==========");
console.log(f);

console.log("Parse Output");
console.log("============");
var tree = interpol.parse(f);
var output = util.inspect(tree, {
  colors: true,
  depth: null
});
console.log(output);
