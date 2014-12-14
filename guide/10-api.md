---
title: A Guide to Interpol
layout: interpol_guide
prev: 09-realworld
next: a1-system
---
## The Interpol API
The primary Interpol API is a single JavaScript module that exposes a single function.  The signature for this function is:

```
interpol(template, runtime);
```

The purpose of this function is to compile template strings into executable JavaScript functions.  The runtime argument can either be a Runtime instance or an Object as passed into the `interpol.runtime()` Function.  If nothing is provided, the Global Runtime will be used.  Here is an example of using the `interpol()` function:

```javascript
var interpol = require('interpol');

var template = interpol("name | 'Hello, %!'");
template({ name: 'World' }); //-> Hello, World!
```

There are several support structures and functions attached to the `interpol()` function.  By default, they are as follows:

  * `VERSION` - The current version of Interpol, represented as a String.
  * `evaluate(source, obj, options)` - Compiles and evaluates the specified source against the provided context object.
  * `compile(source, options)` - compiles a string template, returning an Object that contains the generated JavaScript function body and any errors or warnings that occurred during compilation.
  * `runtime(options)` - creates a new Interpol Runtime instance.  A Runtime manages common resources between a set of Interpol templates and modules and can be used to create an isolated import resolution sandbox.  If options are not passed, the default Interpol Runtime instance is returned.
  * `bless(value)` - Blesses a Function or String as being Interpol-safe.

## Compilation
The `interpol()` function will parse, compile, and generate a function for your template all in one pass.  But there are cases where you may want the compiled JavaScript for a template rather than a function.  In these cases, you'll want to call `interpol.compile()`.

## Runtime Processing
Each compiled function also attaches additional functions, the most important being called `resolveExports()`.  This function is used by resolvers to retrieve partials and variables when the template is loaded as a module.

## Blessing Stuff
Certain security considerations went into the design of Interpol.  It was important that Interpol avoid script injection attacks and the execution of arbitrary content.  That said, there are times when you need to bypass these limitations, but please do so with great care.

### Functions
Interpol *does not* allow arbitrary functions to be called from data passed to it.  To work around this security requirement and allow a function to be called from within Interpol, you must 'bless' that function using `interpol.bless(func)`.  The function you bless should expect to accept a Writer instance as its first argument, followed by any arguments passed from the calling template.

### Strings
Interpol *does not* internally support the ability to send values to the resulting HTML content without escaping those values to avoid script injection attacks.  To work around this security requirement and allow a string to be displayed with embedded HTML tags, you must 'bless' that string using `interpol.bless(str)`.

## Resolvers
A resolver is an interface used by Interpol to resolve an imported module.  There are two available for developer use, and one automatically registered for apps bundled by the command-line interface.

### Memory
A memory resolver allows you to register templates as named modules.  These templates can be strings to be compiled, compiled Interpol Module functions, or Objects containing JavaScript functions.  An instance of this resolver is registered by default in each Runtime.  It can be accessed like so:

```javascript
interpol.runtime().registerModule('myModule',
  "def hello(name)\n" +
  '  "Hello, %name!"\n' +
  "end"
);
```

This will register a module in Interpol's default Runtime instance.  You can then resolve the module in your template:

```ruby
from myModule import hello
hello('World')
```

### File (Node.js only)
A file resolver allows you to monitor a set of directories on disk as a source for your templates.  It's a little more complicated to use than the memory resolver because it requires a target path, and so it's not registered by default.  To create one:

```javascript
var interpol = require('interpol');
var resolvers = require('interpol/lib/resolvers');

resolvers.createFileResolver(interpol.runtime(), {
  path: "./my_templates",
  compile: true, // default: false
  monitor: true  // default: false
});
```

If you wanted to import from a module named 'myModule', Interpol will check for `./my_templates/myModule.int.js`.  If that file doesn't exist, and if `compile` is set to true, then Interpol will check for `./my_templates/myModule.int`.

The `path` property of createFileResolver's options can also take an Array of paths.  The `compile` flag tells the resolver that it should compile Interpol templates (in-memory only) if a JavaScript file can't be found.  The `monitor` flag tells the resolver that it should monitor the directories for changes and reload the modules automatically.
