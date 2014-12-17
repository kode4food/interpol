---
title: A Guide to Interpol
layout: interpol_guide
prev: 07-partials
next: 09-realworld
---
## Importing Stuff
Importing partials and variables in Interpol is similar to Python.  One can either import an entire module as a single variable, or can cherry-pick individual properties.  In all cases, the imported items can be aliased locally.

### Importing Entire Modules
When an entire module is imported, it will be stored as a single local Object variable whose name (unless aliased) is the last component of its module path.

```ruby
import dir.subdir.module1  # will import as 'module1'

import dir.subdir.module1, dir.subdir.module2

import dir.subdir.module1 as myModule  # will import as `myModule`

import dir.subdir.module1 as mod1,
       dir.subdir.module2 as mod2
```

When you've imported an entire module, you have to address its partials or variables via membership paths:

```ruby
import dir.subdir.module1 as myModule
myModule.myPartial('Hello')
```

### Cherry-Picking Items
When cherry-picking, only the imported items will be placed in the local scope, the module itself will be discarded.

```ruby
from dir.subdir.module1 import myVariable

from dir.subdir.module1 import myVariable as myVar

from dir.subdir.module1 import myVariable, myPartial as partial1
partial1('Hello')
```

### Resolvers
A resolver is an interface used by Interpol to resolve an imported module.  There are two available for developer use, and one automatically registered for apps bundled by the command-line interface.

#### Memory
A memory resolver allows you to register templates as named modules.  These templates can be strings to be compiled, compiled Interpol Module functions, or Objects containing JavaScript functions.  An instance of this resolver is registered by default, and is also used to export Interpol's system modules.  It can be accessed like so:

```javascript
interpol.runtime().registerModule('myModule',
  "def hello(name)\n" +
  '  "Hello, %name!"\n' +
  "end"
);
```

You can then resolve the module in your template:

```ruby
from myModule import hello
hello('World')
```

#### File (node.js only)
A file resolver allows you to monitor a set of directories on disk as a source for your templates.  It's a little more complicated to use than the memory resolver, and so is not registered by default.  To create one:

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

The `path` property of createFileResolver's options can also take an Array of paths.  The `compile` flag tells the resolver that it should compile Interpol templates (in-memory only) instead of loading a pre-compiled JavaScript version.  The `monitor` flag tells the resolver that it should monitor the directories for changes and reload the modules automatically.


### Modules and Context
Modules in Interpol have their own context, based on a pre-defined global context.  So the context you provide to your Template won't implicitly be available to them.  This behavior was also intended to avoid surprises, since what you put into a Module is generally meant to be reusable among many Templates.

### System Modules
The default memory resolver exposes the standard run-time library of Interpol.  This library consists of several modules that provide a variety of functionality.  These modules include list, string and math functions.

