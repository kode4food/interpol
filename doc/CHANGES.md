# Change History

## Version 0.2 - First Stable Release
This is the first stable (even numbered) release of Interpol.  There isn't any new and noteworthy functionality to be seen.  Instead, the release has focused on additional test coverage and documentation.

## Version 0.1.7 - Partial Hoisting
Partials are now conditionally hoisted to the top of their scope.  The condition for hoisting is that the name can't have already been encountered as a `let` assignment or partial definition in the current scope.  So if you define a partial that doesn't meet this condition, that definition will occur in-place.

For example, this is a valid hoist:

```python
# content will already be available for calling
content()

def content
  "hello"
end
```

While this is not a valid hoist:

```python
let content = "hello"

# error that you're calling a non-partial
content()

def content
  "not gonna happen"
end

# but you *can* call it here
content()
```

## Version 0.1.6 - Modularization
Have introduced Browserify to manage the build process for browser-targeted versions of Interpol.  This has allowed for some modularization refactorings, making the code much easier to maintain.  Any Browserify-specific code is in the `browserify` directory.

Also added a very simple Express example in the `examples` directory.

## Version 0.1.5 - Import Revisited
To reduce ambiguity and context pollution, the `import <module>` statement now imports a module as a single variable rather than automatically importing all of its exported properties.  This will require drilling into its membership.  You can also alias the imported module using `as`.  For example:

```python
import myModule as myAlias
myAlias.myPartial(someContext)
```

## Version 0.1.4 - Express Views
Added a view engine for [Express](http://expressjs.com/).  To set a development instance as the default engine, you can do the following:

```javascript
app.engine('int', require('interpol').__express);
app.set('view engine', 'int');
```

You can also instantiate customized engines.  Customizations include setting the search path for import resolution (uses './views' by default) and turning off file-system monitoring ('true' by default).

## Version 0.1.3 - Let, Unless, Imports and Stuff
Getting close to a usable system

* `let` allows you to define variables in the local scope, meaning it will shadow any variables in a parent scope, rather than allowing you to overwrite them.

* `unless` is syntactic sugar for `if !(...)`

* Importing now works against the three available resolvers: file (Node.js only), helpers, and memory.  See [the API Reference](API_Reference.md) for more information.

* Compiled templates now have an `exports()` function that returns functions and variables defined in their root context.  The results are evaluated against the global context *only*.

* The Command-Line interface can now generate a self-contained bundle of pre-parsed templates that can easily be loaded into a web page or Node.js environment.

* `self` refers to the variables of the current scope, and can be passed around.

* Named Interpolation is now supported.  Any `%` followed by an identifier is expanded to the value of that property in the passed Object. `self` is assumed if nothing is passed.  See [the Language Reference](Language_Reference.md) for more information.

## Version 0.1.2 - Bug Fixes and Test
Fixed some bugs in the PEG.js parser, including its inability to right-recurse unary and membership productions.  Also increased test coverage.

## Version 0.1.1 - Initial Optimizations
Starting to branch around literals as much as possible so that the runtime processor only executes code paths that are absolutely necessary.

## Version 0.1 - Initial Release
This is the initial release of Interpol.  There's still quite a lot to do and probably more than a few bugs, but it's at a stage now where it's somewhat usable.
