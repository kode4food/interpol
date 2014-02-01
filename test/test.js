var fs = require('fs')
  , util = require('util')
  , p = require('./../interpol/parser');

var f = fs.readFileSync('./test.int').toString();
console.log("Input File");
console.log("==========");
console.log(f);

console.log("Parse Output");
console.log("============");
console.log(util.inspect(p.parse(f), { colors: true, depth: null}));