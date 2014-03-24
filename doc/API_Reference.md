# Interpol API Reference

## Interpol Core (interpol/interpol.js)
The Interpol core is a single JavaScript module that exposes a single Function.  This function is named `$interpol()` in the browser, but can be named explicitly in Node.js.  The purpose of this function is to compile template strings, or to load pre-parsed JSON templates.  You can call it like so:

```javascript
var $interpol = require('interpol');

var template = $interpol("'Hello, %!' % name");
template({ name: 'World' }); //-> Hello, World!
```

There are several support structures and functions attached to the `$interpol()` function.  Be default, they are as follows:

  * `VERSION` - The current version of Interpol, represented as a String.
  * `parser` - The Interpol PEG.js Parser Object.
  * `parse()` - parses a string template, return a JSON object that can be stored or passed to the `compile()` function.
  * `compile()` - converts a pre-parsed JSON object to an Interpol compiled closure.
  * `options{}` - Global Options Object (overridden when calling a compiled tempalte)
  * `globals{}` - Global Variable Context (available to all compiled templates)
  * `resolvers[]` - Global Resolver Instances (overridden at compile-time)
  * `bless()` - Blesses a Function as being Interpol-safe

Each compiled closure also attaches additional functions, the most important being called `exports()`.  This function is used by resolvers to retrieve partials and variables when the compiled closure is loaded as a module.

## Resolvers (interpol/resolvers)
A resolver is an interface used by Interpol to resolve an imported module.  There are three available for develop use, and one automatically registered for apps bundled by the command-line interface.

### Helpers
The 'helpers' resolver allows the developer to register JavaScript functions by name.  This Function will then become available as part of the 'helpers' module. An instance of this resolver is registered by default.  It can be retrieved like so:

```javascript
var helperResolver = $interpol.helperResolver;
helperResolver.registerHelper(function hello(writer, name) {
  writer.content("Hello, " + name + "!");
});
```

You can then resolve it in your template:

```html
from helpers import hello
hello('World')
```

### Memory
A memory resolver allows you to register templates as named modules.  These templates can be strings to be compiled, pre-parsed JSON, or compiled closures.  An instance of this resolver is registered by default.  It can be retrieved like so:

```javascript
var memoryResolver = $interpol.memoryResolver;
memoryResolver.registerModule('myModule',
  "def hello(name)\n" +
  "'Hello, %!' % name\n" +
  "end"
);
```

You can then resolve it in your template:

```html
from myModule import hello
hello('World')
```

### File (Node.js only)
A file resolver allows you to monitor a set of directories on disk as a source for your templates.  It's a little more complicated to use than the helper and memory resolvers, and so is not registered by default.  To create one:

```javascript
var interpol = require('interpol')
  , resolvers = require('interpol/resolvers');

var fileResolver = interpol.createFileResolver({
  path: "./my_templates",
  compile: true, // default: false
  monitor: true  // default: false
});

interpol.resolvers().push(fileResolver);
```

If you wanted to import from a module named 'myModule', Interpol will check for `./my_templates/myModule.int.json`.  If that file doesn't exist, and if `compile` is set to true, then Interpol will check for `./my_templates/myModule.int`.

The `path` property of createFileResolver's options can also take an Array of paths.  The `compile` flag tells the resolver that it should compile Interpol templates (in-memory only) if a JSON file can't be found.  The `monitor` flag tells the resolver that it should monitor the directories for changes and reload the modules automatically.

### System
The system resolver exposes the standard run-time library of Interpol.  This library consists of several modules that provide a variety of functionality.  These modules include array and string manipulation, as well as math and local functions.  See [the Language Reference](Language_Reference.md) for more information.
