# Change History

## Version 0.3.14 - Feature Complete
* Refactored the parser/compiler and began to introduce optimizations to the JSON representation that is generated.

* The 'using' statement has been introduced.  It creates a new scope where the properties of any specified expressions are mixed in and made available as local variables.  For example, `name` and `age` may be taken from the `person` instance, while summary might be taken from the `profile` instance.

```python
def renderPerson(person, profile)
  using person, profile
    <div>name</div>
    <div>age</div>
    <div>summary</div>
  end
end
```
 
* The 'array' module has been renamed to 'list'.  The Tuple, Array, and Dictionary distinction is confusing, and completely unnecessary.  So the term 'List' is now preferred.

* For Loops have been extended to support range guards as well as an `else` clause.  You can define an `else` clause for those cases where the for loop finds no matches:

```python
for person in people, brother in person.brothers
  renderItem(person, brother)
else
  "I got nothin'!"
end
```

This becomes especially important if you apply guards to your ranges:

```python
for person in people when person.type == 'stooge',
    brother in person.brothers when brother.living
  renderItem(person, brother)
else
  "I got nothin'!"
end
```

* Added *very crude* pattern matching capability to Partial Definitions in order to facilitate what are essentially inline-guards.  For example:

```python
def renderItem(type, name)
  "This is a %type named %name"
end
```

This partial can be extended to deal with specific type values:

```python
def renderItem("developer", name)
  <b>"Developers rock! Especially %name"</b>
end
```

In this case, no local argument name is bound to the value.  You can simply treat it as discarded.  Under the hood, what is actually happening is something like this:

```python
def renderItem(self[0], name) when self[0] like "developer"
  <b>"Developers rock! Especially %name"</b>
end
```

* The `like` operator was introduced to support inline guards.  Like will perform a deep comparison of values to determine whether the left operand is 'compatible' with the template on the right.

Compatibility is mostly as you would expect, with one exception.  If the template is an Object, only the properties defined in that Object are checked.  If the left operand has additional properties, those are ignored.

## Version 0.3.13 - Simplifying Interpolation
Automatic Interpolation was a pain in the ass when you didn't want it to happen, requiring you to escape all of your percent signs `%`.  Now it will only occur against double quoted strings containing named indexes.  Single quoted strings will be treated as literals.

## Version 0.3.12 - Conditional Operator
* To better support the parse-tree rewriting that is now taking place, moved most of the parser support code into parser.js rather than the PEG.js code.
* The logical negation `!` operator has been renamed `not`.
* The conditional operator is now pythonesque rather than derived from C.

```python
# <true_value> if <condition> else <false_value>
"you are happy!" if happy else "awwwwwww"

# <false_value> unless <condition> else <true_value>
"awwwwwww" unless happy else "you are happy!"
```

## Version 0.3.11 - Guard Fixes
If the argument names for partials with extended guards differed, the context passed between the partials would contain invalid entries.  This has been corrected.

## Version 0.3.10 - Function and Partial Binding
A new binding operator (@) is now supported, replacing the `.configure()` method.  While `configure()` against system functions was only useful for currying, binding against partials is useful when you want to pass the partial around for later invocation.  For example:

```python
from layouts import mainLayout
from partials import renderList
let renderItems = @renderList(items)
mainLayout("A Title", renderItems)
```

Now, if mainLayout invokes `renderItems()` with no parameters, the bound list in `items` will be rendered.  As a result of the general-purpose nature of this operator, if you use it for functions that will be curried into a pipeline, those functions will now require a placeholder as the first argument:

```python
from list import join
let j = @join(nil, " -- ")
let a = ('joined','with','dashes')
"Result is %a|j"
```

## Version 0.3.9 - Basic Guard Support Again
Version 0.3.8 failed to publish build artifacts.  This version corrects that issue.

## Version 0.3.8 - Basic Guard Support
The ability to define a guard clause using the `when` keyword has been added to Partial Definitions.  This allows Partial Definitions to be 're-opened' with additional conditions.

```python
def renderList(people)
  <ul>
  for person in people, sibling in person.siblings
    renderItem(person.name, sibling)
  end
  </ul>
end

def renderList(people) when people.length == 0
  <b>"There are no people to render!"</b>
end
```

*Note:* The order in which partials are defined determines the order in which the guard clauses are evaluated, where the most recently defined will be evaluated first.  If the unguarded version of renderList had been defined last, it would shadow the previous definition, thus short-circuiting its possible evaluation.

## Version 0.3.7 - Extracted Express/Kraken Support
Support for Express and Kraken have been extracted from Interpol-proper and now exist in a separate project called `interpol-express`.  This project can be installed using npm like so:

```bash
npm install interpol-express
```

## Version 0.3.6 - Module Organization
The FileResolver and Bundled Apps now support resolving a file called `index.int` as the stand-in for a module that is otherwise represented as a directory.  This should be familiar to Node.js (`index.js`) and Python (`__init__.py`) developers.  The resolver will first attempt to load the module as a file.  If no file is found, it will test for a directory and associated `index.int` file in order to resolve the module.

### Kraken Support
Added a [Kraken](http://krakenjs.com/) entry point.  In order to use Interpol in a Kraken app, you will have to modify `config/app.json` to include the following:

```json
"view engines": {
  "int": {
    "module": "interpol/kraken"
  }
}
```

Also, if you plan to use Interpol as your default view engine, you can configure it like so:

```json
"express": {
  "view engine": "int"
}
```

*Note:* Be aware that Interpol template filenames must contain valid Interpol identifers, so filenames like `errors/400.dust` will have to become something like `errors/http_400.int`.

## Version 0.3.5 - Extended lists
lists now allow name/value pairs as well as the ability to force a single-element list (rather than treating the parentheses as a precedence operator).  Name/Value lists are always exposed as a Dictionary.  The name must be a valid identifier, while the value is any valid expression.

```python
(
  theMachine = 'Deep Thought',
  theAnswer = (28 - 7) * 2
)
# Treated like a dictionary { theMachine: 'Deep Thought', theAnswer: 42 }
```

Forcing a single-element list is performed as it would be in Python, by ending the list with a comma `,`.  See [the Language Reference](Language_Reference.md) for more information.

## Version 0.3.4 - Consolidated Resolvers
The Helper and System Resolvers have been merged into the Memory Resolver since it's all in memory anyway.  The default Memory Resolver's register/unregister functions are now exposed from the `interpol()` function , so registering a module of JavaScript helpers is easy:

```javascript
interpol.registerModule('myModule', {
  'hello': function (writer, name) {
    writer.content("Hello ," + name + "!");
  },
  'goodbye': function (writer, name) {
    writer.content("Goodbye ," + name + "!");
  }
});
```

See [the API Reference](API_Reference.md) for more information.

## Version 0.3.3 - Configurable Imports
Modules exposed by the system resolver now allow their functions to be configured.  This enables the developer to generate pre-configured pipeline functions.  For example:

```python
from list import join
let j = join.configure(" -- ")
let a = ('joined','with','dashes')
"Result is %a|j"
```

This would output:

```
Result is joined -- with -- dashes
```

The convention used here is that we always treat the first argument to a function as the piped input, and any subsequent arguments are configurable.  Of course, you could have also called `j` normally with `"Result is " + j(a)`

## Version 0.3.2 - Even Better Piped Interpolation
* Fixed a bug in piped interpolation where literals were used as a right-hand operands.
* Express View Engine now stops monitoring/compiling if NODE_ENV != 'development'.

## Version 0.3.1 - Better Piped Interpolation
Piped interpolation can now retrieve functions from the local scope if they're not present in the evaluated data.

## Version 0.3 - Piped Calls, DOM Writer

### Piped Calls
Basic Piped Calls are now supported.  This is useful to create filtering and formatting chains against helper functions.  For example:

```python
from list import join
from string import title
('single', 'title', 'cased', 'string') | join | title
```

The pipe operator has a relatively high precedence.  It is higher than unary, but lower than normal partial calls.

### Piped Interpolation
A limited form of the operator is also supported in string interpolation.

```python
from string import title
"My name is %name|title"
```

The restrictions in using this method are that the pipe character *can not* be surrounded by spaces and the right-hand operands can only be identifiers.

### DOM Writer
A very basic DOM Writer is now available for the browser.  You can create an instance by calling `createDOMWriter` with a parent Element and an optional rendering mode.

```javascript
var parentElem = document.getElementById('content')
  , domWriter = $interpol.createDOMWriter(parentElem, 'insert');
```

Now, every time you invoke your template with this writer, the parentElem's contents will be updated:

```javascript
myTemplate(data, { writer: domWriter });
```

There are three modes: Append, Insert, and Replace (the default).  `append` places any rendering after parentElem's current children, and `insert` at the beginning.  `replace` replaces all of the parentElem's content.

## Version 0.2.1 - Stringify Fix
Small bug fix.  `stringify()` should be called on values being interpolated.

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

* The Command-Line interface can now generate a self-contained bundle of pre-compiled templates that can easily be loaded into a web page or Node.js environment.

* `self` refers to the variables of the current scope, and can be passed around.

* Named Interpolation is now supported.  Any `%` followed by an identifier is expanded to the value of that property in the passed Object. `self` is assumed if nothing is passed.  See [the Language Reference](Language_Reference.md) for more information.

## Version 0.1.2 - Bug Fixes and Test
Fixed some bugs in the PEG.js parser, including its inability to right-recurse unary and membership productions.  Also increased test coverage.

## Version 0.1.1 - Initial Optimizations
Starting to branch around literals as much as possible so that the runtime processor only executes code paths that are absolutely necessary.

## Version 0.1 - Initial Release
This is the initial release of Interpol.  There's still quite a lot to do and probably more than a few bugs, but it's at a stage now where it's somewhat usable.
