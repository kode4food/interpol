---
title: Mistakes Were Made
layout: post
---
I made quite a few mistakes while designing Interpol.  Most of those mistakes were caught and corrected early, like the goofy interpolation operator, but some of them needed to remain in the project, at least for the first version.

### Explicit Exports
One of the biggest mistakes was to automatically export all top-level symbols from a module.  This assumed that any partial or variable define in a module was something that you wanted to use elsewhere.  It also meant a lot of unnecessary context modification, especially in cases where the exported symbols served no purpose.

Version 2.0 will change this by introducing a breaking change.  Specifically, you'll soon have to explicitly export symbols from a module.  Not only will this promote better encapsulation, but it will also allow for top-level optimizations.

### Override Auto-Interpolation
Right now, a double-quoted string is automatically interpolated, while a single quoted string must be explicitly invoked as a function for interpolation to work.  There's no way to override this behavior.

In version 2.0, the unary operators `+` and `-` can be used to explicitly mark a string as being auto-interpolated.  Including single-quoted strings.  The default behavior will remain the same.  So for example:

```ruby
let str1 = -"%name is no longer auto-interpolated"
let str2 = +'%name is now auto-interpolated'
```

### Bye Bye Client-Side Compiler
Another mistake is that I believed it would be worthwhile to parse templates on the client side.  While certainly it's a convenience for JSFiddle examples and such, it's not the type of deployment model I want to promote going forward.

The compiler is massive and slow, and so it makes more sense to do the work ahead of time and then deliver pre-compiled bundles to the browser.  Version 2.0 will correct this by removing the client-side compiler option.

### blessFunction / blessGenerator
The contract for a blessed function is different than that of a blessed generator.  So there should be two APIs for blessing them.  As of Version 2.0, `interpol.bless()` will become three functions:  `blessString()`, `blessFunction()`, and `blessGenerator()`.
