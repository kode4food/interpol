# Change History

## Version 0.1.3 - Let, Unless and Exports
* `let` allows you to define variables in the local scope, meaning it will shadow any variables in a parent scope, rather than allowing you to overwrite them.
* `unless` is syntactic sugar for `if !(...)`
* Compiled templates now have an `exports()` function that returns functions and variables defined in their root context.  The results are evaluated against the global context *only*.

## Version 0.1.2 - Bug Fixes and Test
Fixed some bugs in the PEG.js parser, including its inability to right-recurse unary and membership productions.  Also increased test coverage.

## Version 0.1.1 - Initial Optimizations
Starting to branch around literals as much as possible so that the runtime processor only executes code paths that are absolutely necessary.

## Version 0.1 - Initial Release
This is the initial release of Interpol.  There's still quite a lot to do and probably more than a few bugs, but it's at a stage now where it's somewhat usable.
