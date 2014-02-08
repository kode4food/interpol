var fs = require('fs')
  , interpol = require('./../interpol');

var f = fs.readFileSync('./test.int').toString();
console.log("Input File");
console.log("==========");
console.log(f);

var data = {
  "title": "Famous People",
  "people" : [
    { "name": "Larry", "brothers": [] },
    { "name": "Curly", "brothers": ["Moe", "Shemp"]},
    { "name": "Moe", "brothers": ["Curly", "Shemp"]}
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

var str = fs.readFileSync('./test.int.json').toString();

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
