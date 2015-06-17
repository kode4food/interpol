# Interpol (HTML Composition Language)
[![Build Status](https://travis-ci.org/kode4food/interpol.svg)](https://travis-ci.org/kode4food/interpol)

Interpol is an HTML Composition Language.  That means it's kind of like a templating language, but capable of heavy lifting.  It features:

  * Very flexible string interpolation
  * First-class partials with guards
  * Pattern-matching operator and arguments 
  * Ruby-style block-passing
  * Nested loops with guards and else clauses
  * Full-featured list comprehensions
  * Conditional expressions and statements
  * Modules with Python-style importing
  * Incredibly fast transpiled JavaScript!
  * And much, much more! (See [the Guide](http://interpoljs.io/guide/))

What can you do with it?  Stuff like this:

```ruby
let label = '%0 is a friend of %1'
renderPeople(people)

def renderPeople(people)
  <ul>
  for person in people, friend in person.friends
    <li>
    [person.name, friend.name] | label
    </li>
  end
  </ul>
end

def renderPeople(people) when not people
  <b> 'There are no people to render' </b>
end
```

`renderPeople` is a partial.  Its first form renders a list of interpolated strings resulting from a set of nested loops.  The second form is a guarded version that catches the case when there is no `people` value or it is empty.  How easy is that to do with your current template system?  I suspect pretty difficult.  Maybe not possible at all.

## So Why HTML Composition?
There has been a lot of noise about logic-less templates in recent years.  The sales pitch is that they enforce separation of concerns, so that business logic doesn't taint the presentation layer.  Fair enough, I agree, separation of concerns is a good thing.

In reality the separation of concerns is still violated in many cases, except that it's now your business logic that's often tainted with presentation-specific mapping acrobatics to massage your data into a form the template system will accept.  You're also having to leverage helpers extensively, backfilling the 'logic' a logic-less template system refused to provide in the first place.

That being the case, what's the benefit of a logic-less template system?  None that I can see.  Especially when a developer can *still* choose to separate concerns in their design.  And trust me, most developers are smart enough to make that decision on their own.  You don't have to force their hands by giving them tools that paint them into a corner.

Interpol lets *you* decide and makes sure you're not crippled as a result of your decision.

## More About Interpolation
You might ask why the interpolation was so involved.  After all, in other systems you could just embed the values directly into the resulting content.  You can do something like that in Interpol as well.  It would look like this: 

```ruby
person.name 'is a friend of' friend.name
```

But that approach falls down once you start localizing your application (and you probably will).  Interpol was designed with localization in mind.  In a real Interpol application, you'd probably define such a `label` in a single module of localized strings and then pull them into your template with an `import` statement.

You could have also performed the interpolation using named indexes rather than positional ones: 

```ruby
let label = '%pname is a friend of %fname'
# ... and then inside the for loop ...
[pname = person.name, fname = friend.name] | label
```

## Interpol and node.js
To use Interpol directly from node.js applications, npm install it like so:

```bash
npm install interpol --save
```

You can then include it in your Node code like so:

```javascript
var interpol = require('interpol');
```

### Using the Library
To compile a raw template into a closure, invoke `interpol(String)` as a function.  Provide to it a string containing your template:

```javascript
var compiledTemplate = interpol(someTemplateString);
```

This will generate a closure that takes up to two parameters, both of which are optional.  The first is the data that your template renders.  The second is an options object used to override the content writer interface.  By default, the library writes to a JavaScript string.

```javascript
console.log(
  compiledTemplate({
    list: [
      { type: 'task', id: 1, name: 'This is my first task' },
      { type: 'story', id: 2, name: 'This is my first story' }
    ]
  })
);
```

### Express / hapi Integration
For [Express](http://expressjs.com/) or [hapi](http://hapijs.com/) View Rendering, you can install the `interpol-views` package with NPM:

```bash
npm install interpol-views --save
```

You can then follow the instructions available at the [interpol-views](http://github.com/kode4food/interpol-views) GitHub page.

## Interpol and the Browser
To add Interpol as a Bower dependency to your project, do the following:

```bash
bower install interpol --save
```

### Inclusion in a Web Page
To include Interpol templates in the browser, they must be loaded from pre-compiled JavaScript bundles.  These bundles will automatically registered with Interpol when loaded, so all you have to do is load them in the right order, and then invoke them somehow:

```html
<script src="build/interpol.min.js"
        type="text/javascript"></script>
<script src="your_bundle.js"
        type="text/javascript"></script>
<script>
  var your_bundle = interpol.your_bundle;
  var res = your_bundle.yourTemplate({ 
    greeting: 'hello'
  });
</script>
```

*Note:* The Interpol command-line interface generates pre-compiled bundles.  You can install this globally using `npm -g install` and can then invoke the tools at your terminal by typing `interpol`.

## More Information
More information about Interpol can by found at the [Interpol Web Site](http://www.interpoljs.io/) and in the [Interpol Guide](http://www.interpoljs.io/guide).

## License (MIT License)
Copyright (c) 2014, 2015 Thomas S. Bradford

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
