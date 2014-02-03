var fs = require('fs')
  , interpol = require('./../interpol');

var f = fs.readFileSync('./test.int').toString();
console.log("Input File");
console.log("==========");
console.log(f);

console.log("Parse Output");
console.log("============");

var data = {
  list: [
    { type: 'task', id: 1, name: 'This is my first task' },
    { type: 'story', id: 2, name: 'This is my first story' },
    { name: 'This item has no type' }
  ]
};

var ps = new Date()
  , tree = interpol.parse(f)
  , cs = new Date()
  , comp = interpol.compile(tree)
  , es = new Date()
  , result = comp(data)
  , ee = new Date();

console.log("Parse: " + (cs-ps) +
            "ms / Compile: " + (es-cs) +
            "ms / Execute: " + (ee-es) + "ms");

console.log(result);
