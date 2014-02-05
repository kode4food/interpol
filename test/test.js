var fs = require('fs')
  , interpol = require('./../interpol');

var f = fs.readFileSync('./test.int').toString();
console.log("Input File");
console.log("==========");
console.log(f);

var data = {
  list: [
    { type: 'task', id: 1, name: 'This is my first task' },
    { type: 'story', id: 2, name: 'This is my first story' },
    { name: 'This item has no type' }
  ]
};

var ps = new Date()
  , parseResult = interpol.parse(f)
  , cs = new Date()
  , closure = interpol.compile(parseResult)
  , es = new Date()
  , closureResult = closure(data)
  , ee = new Date();

console.log("Template Parse: " + (cs-ps) +
            "ms / Compile: " + (es-cs) +
            "ms / Execute: " + (ee-es) + "ms");
console.log('');

var str = fs.readFileSync('./test.json').toString();

var c1 = new Date()
  , json = JSON.parse(str)
  , c2 = new Date()
  , cl = interpol.compile(json)
  , c3 = new Date()
  , nr = cl(data)
  , c4 = new Date();

console.log("JSON Parse: " + (c2-c1) +
  "ms / Compile: " + (c3-c2) +
  "ms / Execute: " + (c4-c3) + "ms");
console.log('');

console.log("Parser Output");
console.log("============");
console.log(str);
console.log('');

console.log("Template Output");
console.log("===============");
console.log(closureResult);
