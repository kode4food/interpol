# Change History

## Version 1.6 - List Membership Checking
`in` and `not in` are subset operators.  `in` will report true or false depending on whether the left operand is a member of the right operand's list.  `not in` obviously does the opposite.  In the case of Vectors, the first element that matches will generate a positive result.  In the case of Dictionaries, only the names of the entries are checked.

## Version 1.5.7 - HTML5 Element Names
HTML5 supports rather free-form element names that weren't being honored by Interpol.  This has been corrected.

## Version 1.5.6 - Escaping Regex Corrected
Regex State was being maintained between calls of the content and attribute escape functions, causing busted output in some cases.  This has been corrected.

## Version 1.5.4, 1.5.5 - Blessed Functions Shouldn't Invoke Like Partial
Invoking a blessed function like a partial potentially opens up an injection opportunity.  This ability has been removed.

## Version 1.5.3 - Angular Friendliness
Interpol is now Angular and Mustache-friendly, making it useful as an initial step in a rendering pipeline.  This means that if it encounters brackets in its parsing, it will treat the content of those brackets as something that should be passed directly through to the resulting HTML.  The parser will count the number of leading brackets and then terminate when it encounters a matching closing set.  This will allow Interpol to deal with implementations like Dust.js who only use single brackets.  So for example:

```html
<b> {{fname + ' ' + lname}} </b>
```

## Version 1.5.2 - Vector Matching
Like dictionaries, vectors will now only be partially matched when used as the right side of a `like` or inline guard operation.  For example, the following will result in a true evaluation:

```ruby
["red", "green", "blue"] like ["red", "green"]
```

While this will not:

```ruby
["red", "green"] like ["red", "green", "blue"]
```

## Version 1.5.1 - Pluralizer
You can now create a pluralizer, particularly useful for piped calls and interpolations:

```ruby
from render import pluralizer
let years = pluralizer('% year', '% years')
let person = [name = 'Bill', age = 97]
person | "%name is %age|years old"
```

## Version 1.5 - Partials Called With 'do' Statements
A partial call can now be made to leverage a block of statements attached to it.  These statements produce an inline partial which is treated as the final passed argument.  For example:

```html
def header(block)
  <h1> block </h1>
end

header do
  "hello there"
end

# results in: <h1> hello there </h1>
```

This will call the `header()` partial with the provided statement block (in this case `"hello there"`).

```html
def classyHeader(classes, block)
  <h1 class=classes> block </h1>
end

classyHeader(['title']) do
  "hello there"
end

# results in: <h1 class='title'> hello there </h1>
```

This will call the `classyHeader()` partial with an array of classes and the provided block of statements.

```html
def renderList(title, items, renderer)
  <h1>title</h1>
  for item in items
    renderer(item)
  end
end

# 'with' and 'do' are synonymous
renderList("People", people) with |item|
  item | "Name is %name and age is %age"
end
```

In this case, the `renderList()` partial will loop over the provided items, invoking the `renderer` block of statements for each.  It will also pass the item into the block.

See [the Interpol Guide](http://interpoljs.io/guide) for more information.

## Version 1.4.3, 1.4.4 - For Loop Scope Fixed
Contextual scope in `for` loops was leaking into the parent scope for shadowed variables.  This has been corrected.

## Version 1.4.2 - Dictionary Creation Optimizations
Creation of a Dictionary from non-literal expressions has now been optimized to no longer create an immediately invoked function.

## Version 1.4.1 - List Comprehension Optimizations
List Comprehensions and the boolean `and` and `or` operators have been optimized a little bit.  List comprehensions no longer create an immediately invoked function, while the two boolean operators no longer evaluate the first operand twice.

## Version 1.4 - Gulp Build System
The build system has been converted to using gulp rather than the crude `npm run-script` system that I had previously thrown together.  The process of building is still the same, you can type `npm install && npm run-script build` but if you have gulp installed globally, you can also call it directly.

## Version 1.3 - Override Auto-Interpolation
Interpol now seems to work properly on Internet Explorer 9, but your mileage may vary.

Previously, a double-quoted string was automatically interpolated, while a single quoted string had to be explicitly invoked as a function for interpolation to work.  There was no way to override this behavior.

Now, the unary operators `+` and `-` can be used to explicitly mark a string as being auto-interpolated (or not).  Including single-quoted strings.  The default behavior will remain the same.  So for example:

```ruby
let str1 = -"%name is no longer auto-interpolated"
let str2 = +'%name is now auto-interpolated'
```

This will *only* work on Interpolated Strings.  For regular Strings, it will behave as JavaScript does, where it attempts converting the String to a Number before applying the unary operator.

## Version 1.2.11 - Generators
`for` Statements and List Comprehensions can now leverage pseudo-generators for their results.  I say pseudo-generators because I wasn't going to polyfill the entire generator infrastructure of ES6.  Instead I created a simpler mechanism that is similar to Python's Iterators.

Specifically, if your function is blessed with a type of 'gen' then the for loop will continue to call it until `interpol.stopIteration` is returned.

In order to bless a function with a specific type, `interpol.bless()` takes a second argument.  In this case, it must be the string `'gen'`.  See `lib/resolvers/system/math.range()` for an example.

```ruby
from math import range
[ "key_%i" for i in range(1,10) ]
# results in: key_1 key_2 key_3 key_4 ...
```

## Version 1.2.8 - StringWriter Pool
The Runtime now maintains an internal StringWriter pool to avoid excessive object creation when a writer isn't provided as part of a Template's options.

## Version 1.2.7 - More Consistent Lists
The two types of lists (vectors and dictionaries) are now more consistent with one another in terms of behavior.  Now, a dictionary must have at least one pair to be considered 'truthy'.  Also, the `length()`, `first()` and `last()` functions operate against dictionaries similarly.

## Version 1.2.6 - Render Helpers
Added three helpers for rendering to a new system module called `render`.  They are `counter(start, increment)`, `evenOdd(evenVal, oddVal)` and `separator(sep)`.  They basically do what you'd expect them to do except that calling each returns a new evaluable function that acts as a generator for values in their sequences.  For example:

```ruby
from render import counter
let c = counter(100, 10)
for item in list
  "#% - %" [c(), item.name]
end
```

## Version 1.2.4, 1.2.5 - Improved Member Retrieval
There have been internal changes to the way membership paths are resolved.  If multiple depths of properties are traversed, only a single function call will be invoked.

## Version 1.2.3 - Stringify Improvement
The stringify implementation was doing a lot of conditional branching.  Broke it out into two separate versions, one that escapes and one that doesn't.  This has improved performance quite a bit.

## Version 1.2.2 - StringWriter Improvement
String concatenation is significantly faster in many JavaScript engines than Array.join().

## Version 1.2.1 - Partial toString()
Stringify-ing a partial now results in something other than an empty string.  Specifically, it invokes the partial and returns the content it produced.  The reasoning: If a String can be a Function, then a Function should also be a String.  Also works with bound partials.

## Version 1.2 - Corrected @bind Behavior
The binding operator `@` was brain dead and worked in a way that completely deviated from what you might expect from it.  So I've corrected that.  It now works more or less like JavaScript's `bind()` function, where all arguments will be hard-wired as initial arguments for the resulting bound function.

Two of the system functions have also been changed to accommodate the new binding method, they are `string.split()` and `list.join()`.  Specificaly, the `delimiter` argument is now the first argument, but is considered optional.  This will allow you to pre-bind a delimiter without the `nil` placeholder that was previously required.  Example:

```ruby
from list import join
let myJoin = @join(' and ')
['red', 'green', 'blue'] | myJoin
```

This will result in: `red and green and blue`.

## Version 1.1 - List Comprehensions
List Comprehensions are now supported for both vector and dictionary backed lists.  They work similarly to Python except that they support multiple ranges as well as guards (because they're backed by Interpol `for` loops).  Here's a vector comprehension:

```ruby
let source = [10, 20, 30, 40, 50]
let result = [val * 2 for val in source when val gt 20]
result
```

This will display `60 80 100`.  And here's a dictionary comprehension:

```ruby
let source = [10, 20, 30, 40, 50]
let result = [val + '_key': val*val for val in source]
result['30_key']
```

This will display `900`.

To support generating new dictionaries via comprehensions, a new syntax has been introduced that allows you to synthesize dictionary keys using expressions.  This will work both in list comprehensions and literal list constructions.  It's performed using a separating colon `:` rather than an equal sign `=`.

```ruby
[
  name = 'Interpol',   # this will still work, binding name
  99: 'ninety nine',   # 99 now maps to 'ninety nine'
  var + '_test': var   # concatenated var maps to var
]
```

An interpolation escape can now be terminated with a semi-colon `;`.  This will allow you to concatenate interpolations to literals without being forced to separate them with a space or other non-identifying character.  Example:

```ruby
"%attr;_class" [ attr = 'first' ]  # will display 'first_class'
```

Of course it means you'll have to double your semi-colons if you plan to use one after an interpolation, but how often are you going to do that?

## Version 1.0.2 - Blessing Strings
External Strings can now be blessed using `interpol.bless()` which will allow them to pass through the system without being escaped.  As before, if the value is not a String or a Function, an Exception will be raised.

## Version 1.0.1 - Formatter Refactoring
Refactored the format module a bit to reduce the number of functions invoked.

## Version 1.0 - Major Changes
This is version 1.0 of Interpol.  It introduces several changes that I've been wanting to make for quite a while.  These changes needed to happen with 1.0 to avoid forever being married to the old way of doing things.  Therefore 1.0 is *not* backward compatible to the 0.x releases.

The 'using' statement and expression have been removed.  Their use was confusing and unnecessarily complicated the code-generation process.

Lists are now constructed using square brackets rather than parentheses.  I did this because it makes parsing a little less prone to ambiguity and because, quite honestly, I was seeing too many fucking parentheses.

The '%' operator has been removed.  Allowing arbitrary interpolation was a potential security risk and also a completely useless syntax.  Now all literal strings that contain escapes will be treated as capable of being interpolated.  They can then be called as a function, either using the pipe operator or a normal function call.  For example:

```ruby
let person = [name = 'Bob', age = 42]
person | "my name is %name and I am %age"
# or
"my name is %name and I am %age"(person)
```

Keep in mind that if they're not involved in a function call, double quoted strings are *still* automatically interpolated against local variables.  Also, support functions (those referenced by in-string pipe operators) are gathered from the string's creation scope, not from its execution scope.

Literal lists can be applied to literal strings as an Interpolation shorthand:

```ruby
"my name is %name and I am %age" [name = 'Bob', age = 42]
```

Note that this *only* applies to literal strings and lists, and is basically syntactic sugar for:

```ruby
"my name is %name and I am %age"([name = 'Bob', age = 42])
```

If you still absolutely need to perform arbitrary interpolation, you can use the `build(str, [supportFuncs])` function in the `string` system module.

Indexed Interpolation is now zero-based so that it is consistent with indexed retrieval from lists.  So, you'd perform the interpolation like so:

```ruby
"%1 is the new %0" ['black', 'red']
```

## Version 0.9.4, 0.9.5 - Bug Fix - File Resolver
File resolver was not properly loading compiled templates.

## Version 0.9.3 - Better Code Generation
The JavaScript code generator now attempts to avoid leveraging Immediately Invoked Function Expressions wherever possible.

## Version 0.9.1, 0.9.2 - interpol-views Integration
Added `resolve()` function to the Runtime to support import resolution by external libraries.

## Version 0.9 - Compiler Rewrite
The compiler backend has been completely rewritten.  It now transpiles JavaScript instead of generating JSON information.  This has resulted in significant performance improvements for template processing and greatly reduces the size of the Interpol runtime.  It does mean that on-the-fly compilation is a little slower, but this is only a one-time penalty.

## Version 0.4.2 - Synonyms
The global function for Web Browser deployment has been renamed from `$interpol()` to `interpol()`.

Synonyms for the following keywords have been added:

  * `lte` can now be used in place of `le` (less than or equal to)
  * `gte` can now be used in place of `ge` (greater than or equal to)
  * `where` can now be used in place of `when` (for guard clauses)

The goal here, particularly for the `where` synonym, is to make your code a little more readable and contribute to its ability to convey your intent.

Various optimizations relating to the treatment of literals have been added.  These include constant folding and branch elimination.

`createArrayWriter()` has been renamed to `createStringWriter()` because that's what it does.

## Version 0.4.1 - 'using' Expressions
Test coverage has been greatly increased, from about 50% to 90%.  Corrected quite a few bugs in the process, some of them major.

The 'using' construct can now be applied to individual expressions.

```ruby
let result = "%name and %age" using person, profile
```

## Version 0.4 - Stabilization
A lot of effort has been put into stabilizing the Interpol code base.  There are no new features in this release, but some have been removed.  Also, some behaviors have been clarified.  Specifically:

Removed single-line `:` syntax for statements, so you *have* to use `end` now.  This choice was made because HTML in combination with this feature would create more confusion than benefit.

Both JavaScript `null` and `undefined` now resolve to Interpol's `Nil`.

All equality comparisons now use the strict `===` and `!==` operators.  Meaning you can no longer compare the values 1 and "1" and expect a `true` result.  JSON differentiates between Strings and Numbers.  So does Interpol.

Conditionals operators (if/unless/when) now follow a strict definition of 'truthy' rather than JavaScript's.  In Interpol 'truthy' is any value that matches the following criteria:

  * Arrays with at least one element
  * Strings with at least one character
  * The boolean 'true'
  * Non-Zero Numbers
  * Any Object

The Separate Language and API References will eventually be removed.  Instead, [The Interpol Guide](http://interpoljs.io/guide) will serve as an ongoing source of Interpol Information.

## Version 0.3.17 - Bower Support
Adding Bower Support.

```bash
bower install interpol
```

## Version 0.3.16 - HTML Attributes
Now dealing with HTML Attributes in a more HTML5-friendly way.  If the value is a boolean, either render the attribute name or omit it completely.

## Version 0.3.15 - Browserify Fix
Browserify version wasn't being built correctly.

## Version 0.3.14 - Feature Complete
Refactored the parser/compiler and began to introduce optimizations to the JSON representation that is generated.

The 'using' statement has been introduced.  It creates a new scope where the properties of any specified expressions are mixed in and made available as local variables.  For example, `name` and `age` may be taken from the `person` instance, while summary might be taken from the `profile` instance.

```ruby
def renderPerson(person, profile)
  using person, profile
    <div>name</div>
    <div>age</div>
    <div>summary</div>
  end
end
```

The 'array' module has been renamed to 'list'.  The Tuple, Array, and Dictionary distinction is confusing, and completely unnecessary.  So the term 'List' is now preferred.

For Loops have been extended to support range guards as well as an `else` clause.  You can define an `else` clause for those cases where the for loop finds no matches:

```ruby
for person in people, brother in person.brothers
  renderItem(person, brother)
else
  "I got nothin'!"
end
```

This becomes especially important if you apply guards to your ranges:

```ruby
for person in people when person.type == 'stooge',
    brother in person.brothers when brother.living
  renderItem(person, brother)
else
  "I got nothin'!"
end
```

Added *very crude* pattern matching capability to Partial Definitions in order to facilitate what are essentially inline-guards.  For example:

```ruby
def renderItem(type, name)
  "This is a %type named %name"
end
```

This partial can be extended to deal with specific type values:

```ruby
def renderItem("developer", name)
  <b>"Developers rock! Especially %name"</b>
end
```

In this case, no local argument name is bound to the value.  You can simply treat it as discarded.  Under the hood, what is actually happening is something like this:

```ruby
def renderItem(self[0], name) when self[0] like "developer"
  <b>"Developers rock! Especially %name"</b>
end
```

The `like` operator was introduced to support inline guards.  Like will perform a deep comparison of values to determine whether the left operand is 'compatible' with the template on the right.

Compatibility is mostly as you would expect, with one exception.  If the template is an Object, only the properties defined in that Object are checked.  If the left operand has additional properties, those are ignored.

## Version 0.3.13 - Simplifying Interpolation
Automatic Interpolation was a pain in the ass when you didn't want it to happen, requiring you to escape all of your percent signs `%`.  Now it will only occur against double quoted strings containing named indexes.  Single quoted strings will be treated as literals.

## Version 0.3.12 - Conditional Operator
To better support the parse-tree rewriting that is now taking place, moved most of the parser support code into parser.js rather than the PEG.js code.

The logical negation `!` operator has been renamed `not`.

The conditional operator is now pythonesque rather than derived from C.

```ruby
# <true_value> if <condition> else <false_value>
"you are happy!" if happy else "awwwwwww"

# <false_value> unless <condition> else <true_value>
"awwwwwww" unless happy else "you are happy!"
```

## Version 0.3.11 - Guard Fixes
If the argument names for partials with extended guards differed, the context passed between the partials would contain invalid entries.  This has been corrected.

## Version 0.3.10 - Function and Partial Binding
A new binding operator (@) is now supported, replacing the `.configure()` method.  While `configure()` against system functions was only useful for currying, binding against partials is useful when you want to pass the partial around for later invocation.  For example:

```ruby
from layouts import mainLayout
from partials import renderList
let renderItems = @renderList(items)
mainLayout("A Title", renderItems)
```

Now, if mainLayout invokes `renderItems()` with no parameters, the bound list in `items` will be rendered.  As a result of the general-purpose nature of this operator, if you use it for functions that will be curried into a pipeline, those functions will now require a placeholder as the first argument:

```ruby
from list import join
let j = @join(nil, " -- ")
let a = ('joined','with','dashes')
"Result is %a|j"
```

## Version 0.3.9 - Basic Guard Support Again
Version 0.3.8 failed to publish build artifacts.  This version corrects that issue.

## Version 0.3.8 - Basic Guard Support
The ability to define a guard clause using the `when` keyword has been added to Partial Definitions.  This allows Partial Definitions to be 're-opened' with additional conditions.

```ruby
def renderList(people)
  <ul>
  for person in people, sibling in person.siblings
    renderItem(person.name, sibling)
  end
  </ul>
end

def renderList(people) when not people
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
The FileResolver and Bundled Apps now support resolving a file called `index.int` as the stand-in for a module that is otherwise represented as a directory.  This should be familiar to node.js (`index.js`) and Python (`__init__.py`) developers.  The resolver will first attempt to load the module as a file.  If no file is found, it will test for a directory and associated `index.int` file in order to resolve the module.

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

```ruby
(
  theMachine = 'Deep Thought',
  theAnswer = (28 - 7) * 2
)
# Treated like a dictionary { theMachine: 'Deep Thought', theAnswer: 42 }
```

Forcing a single-element list is performed as it would be in Python, by ending the list with a comma `,`.  See [The Interpol Guide](http://interpoljs.io/guide) for more information.

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

See [The Interpol Guide](http://interpoljs.io/guide) for more information.

## Version 0.3.3 - Configurable Imports
Modules exposed by the system resolver now allow their functions to be configured.  This enables the developer to generate pre-configured pipeline functions.  For example:

```ruby
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
Fixed a bug in piped interpolation where literals were used as a right-hand operands.

Express View Engine now stops monitoring/compiling if NODE_ENV != 'development'.

## Version 0.3.1 - Better Piped Interpolation
Piped interpolation can now retrieve functions from the local scope if they're not present in the evaluated data.

## Version 0.3 - Piped Calls, DOM Writer

### Piped Calls
Basic Piped Calls are now supported.  This is useful to create filtering and formatting chains against helper functions.  For example:

```ruby
from list import join
from string import title
('single', 'title', 'cased', 'string') | join | title
```

The pipe operator has a relatively high precedence.  It is higher than unary, but lower than normal partial calls.

### Piped Interpolation
A limited form of the operator is also supported in string interpolation.

```ruby
from string import title
"My name is %name|title"
```

The restrictions in using this method are that the pipe character *can not* be surrounded by spaces and the right-hand operands can only be identifiers.

### DOM Writer
A very basic DOM Writer is now available for the browser.  You can create an instance by calling `createDOMWriter` with a parent Element and an optional rendering mode.

```javascript
var parentElem = document.getElementById('content')
  , domWriter = interpol.createDOMWriter(parentElem, 'insert');
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

```ruby
# content will already be available for calling
content()

def content
  "hello"
end
```

While this is not a valid hoist:

```ruby
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

```ruby
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

`let` allows you to define variables in the local scope, meaning it will shadow any variables in a parent scope, rather than allowing you to overwrite them.

`unless` is syntactic sugar for `if !(...)`

Importing now works against the three available resolvers: file (node.js only), helpers, and memory.  See [The Interpol Guide](http://interpoljs.io/guide) for more information.

Compiled templates now have an `exports()` function that returns functions and variables defined in their root context.  The results are evaluated against the global context *only*.

The Command-Line interface can now generate a self-contained bundle of pre-compiled templates that can easily be loaded into a web page or node.js environment.

`self` refers to the variables of the current scope, and can be passed around.

Named Interpolation is now supported.  Any `%` followed by an identifier is expanded to the value of that property in the passed Object. `self` is assumed if nothing is passed.  See [The Interpol Guide](http://interpoljs.io/guide) for more information.

## Version 0.1.2 - Bug Fixes and Test
Fixed some bugs in the PEG.js parser, including its inability to right-recurse unary and membership productions.  Also increased test coverage.

## Version 0.1.1 - Initial Optimizations
Starting to branch around literals as much as possible so that the runtime processor only executes code paths that are absolutely necessary.

## Version 0.1 - Initial Release
This is the initial release of Interpol.  There's still quite a lot to do and probably more than a few bugs, but it's at a stage now where it's somewhat usable.
