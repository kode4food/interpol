# Interpol (Templates Sans Facial Hair)

## Introduction
There are a lot of templating systems out there and they're all similar.  In truth, Interpol isn't so different, which might beg the question:

    Why the hell another templating system?

The answer is simple.  I'm sick of looking at a template and being unable to read the thing, even if I wrote it yesterday.  That's why I developed Interpol.

That said, Interpol's goals are modest.  It should:

  * Provide templates where *meaning* takes a front seat
  * Work well in both Node.js and the Browser

Also, it *will not* participate in the member-measuring and micro-optimization that seem to be so important to some developers.  Specifically, Interpol has:

  * No desire to have the 'smallest' minified footprint
  * No desire to be the 'fastest' template processor

Interpol will be as *small* and *fast* as possible, but no more, especially if those considerations would require compromising the aforementioned goal of providing *meaning*.

## Interpol Seeks 'Meaning'
Stuff you write should 'mean' something.  Not only at the time it's written, but years later.  It should also mean something to new eyes.  The arguments for terseness haven't flown since we stopped using punch cards.  So, assuming you know some HTML, take a look at this Interpol template to understand what I suggest by *meaning*:

```html
<html>
  <body>
  for person in people when person.active
    <div class="person">
      <div class="name"> person.name </div>
      <div class="address"> person.address </div>
      <div class="telephone"> person.telephone </div>
    </div>
  else
    <div class="empty">
      "Nobody to render!"
    </div>
  end
  </body>
</html>
```

In looking at this, you can probably understand why "Nobody to render!" must be quoted.  It's because Interpol focuses on producing the structure and content of dynamic HTML documents.  It's a "path of least resistance" approach that forgoes static content 'escaping' methods such as `{` braces `}`.  Static content is becoming less frequent in a world of localized web apps, so Interpol chooses to shift the resistance in that direction.

This template is actually completely dynamic, including the HTML tags and attributes. It just so happens that these tags consist of literals, but you could also generate tags based on variables.  For example:

```html
<div class="person">
  for field in ('name', 'address', 'telephone')
    <div class=field> person[field] </div>
  end
</div>
```

Here the `class` attribute of the second div, rather than being a literal string, is retrieved from the field names that are processed.

## Don't Repeat Yourself
What if you find that you need the ability to re-use the rendering of people?  Both groups and individuals?  You can break them out into partials:

```html
<html>
  <body>
    renderPeople(people)
  </body>
</html>

def renderPeople(people)
  for person in people when person.active
    renderPerson(person)
  else
    <div class="empty">
      "Nobody to render!"
    </div>
  end
end

def renderPerson(person)
  <div class="person">
    for field in ('name', 'address', 'telephone')
      <div class=field> person[field] </div>
    end
  </div>
end
```

What if you need to do a special rendering for people who don't want their demographic data presented?  You can add a guarded version of the partial:

```html
def renderPerson(person) when person.likesPrivacy
  <div class="person">
    <div class="name"> person.name </div>
  </div>
end
```

## No, Really, Don't Repeat Yourself
What if you use these partials in multiple templates?  Then you can move them out into their own module, maybe called `people.int`.

```html
# this is people.int
def renderPeople(people)
  for person in people when person.active
    renderPerson(person)
  else
    <div class="empty">
      "Nobody to render!"
    </div>
  end
end

def renderPerson(person)
  <div class="person">
    for field in ('name', 'address', 'telephone')
      <div class=field> person[field] </div>
    end
  </div>
end

def renderPerson(person) when person.likesPrivacy
  <div class="person">
    <div class="name"> person.name </div>
  </div>
end
```

And import them like so:

```html
from people import renderPeople
<html>
  <body>
    renderPeople(people)
  </body>
</html>
```

Easy as pie!  And your primary template gets right to the point.

## Current Status
The grammar has stabilized.  The system libraries are still under development, particularly formatting generators.  Check [the TODO document](doc/TODO.md) for an idea of what's to come.

## Interpol and Node.js
To use Interpol directly from Node.js applications, NPM install it like so:

```bash
npm install interpol --save
```

You can then include it in your Node code with the following:

```javascript
var interpol = require('interpol');
```
### Express Integration
For [Express](http://expressjs.com/) or [Kraken](http://krakenjs.com/) View Rendering, NPM install it like so:

```bash
npm install interpol-express --save
```

You can then follow the instructions at the [Interpol-Express](https://bitbucket.org/kode4food/interpol-express) Bitbucket page.

### hapi Integration
For [hapi](http://hapijs.com/) View Rendering, NPM install it like so:

```bash
npm install hapi-interpol --save
```

You can then follow the instructions at the [hapi-interpol](https://bitbucket.org/kode4food/hapi-interpol) Bitbucket page.

## Interpol and the Browser
To add Interpol as a Bower dependency to your project, do the following:

```bash
bower install interpol --save
```

### Inclusion in a Web Page
There are two ways to include Interpol templates in a browser-based application.  One is to compile raw templates using the Interpol compiler.  Another is to load the templates from pre-compiled bundles.  The PEG.js parser used by the compiler is *massive* and slower than loading JavaScript, but it may be necessary if you want to compile ad-hoc templates.

*Note:* The entry point function for Interpol in the browser is *always* named `interpol()`.

### Pre-Compiled JavaScript Bundles
Application bundles can be pre-compiled and automatically registered with Interpol.  This will allow you to bypass the loading of the compiler and PEG.js parser.  Instead, you can load sets of pre-compiled templates from your server for faster initialization.

```html
<script src="build/interpol.min.js" type="text/javascript"></script>
<script src="your_bundle.js" type="text/javascript"></script>
```

*Note:* The Interpol command-line interface generates pre-compiled bundles.  You can install this globally using `npm -g install` and can then invoke the tools at your terminal by typing `interpol`.

### Including the PEG.js Compiler
If you *must* parse raw templates in the browser, you will need to load the version of Interpol that includes the compiler (and its PEG.js parser).

```html
<script src="build/interpol-parser.min.js" type="text/javascript"></script>
```

## Using the Library
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

## License (MIT License)
Copyright (c) 2014 Thomas S. Bradford

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
