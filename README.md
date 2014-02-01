# Interpol (Templates Sans Facial Hair)

## Introduction

At this moment, you might be asking yourself a simple, and well-deserved question:

    Why the fuck another templating system?

Admittedly, there are a lot of them out there and they're all very similar.  In truth, Interpol isn't very different, except that it does one thing that most templating systems don't do:

    It favors producing dynamic content

This is important because more often than not the templates we're creating are pretty much devoid of static content, so why is it that we need to 'escape' into a dynamic content mode using braces or processing instructions?  Why don't we just start in that mode and stay there?

```html
<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with % items" % list.length
    <ul>
    for item in list
      <li class=item.type id="id-%" % item.id>
        item.name
      </li>
    end
    </ul>
  </body>
</html>
```

The only static element on this page was its title, and usually even that isn't static.  So what did we do to 'escape' it for static rendering?  We wrapped it in quotes.  The rest of the page mixed html-ish elements and dynamic content rather seemlessly.

I say 'html-ish' because it's not pure html.  The value of attributes are also dynamically evaluated.  For example:

```html
<li class=item.type id="id-%" % item.id>
```

`class=item.type` outputs a class attribute whose value is taken directly from the item.type property.  `id="id-%" % item.id` outputs an id attribute whose value is interpolated from the item.id property.

That's all well and good, but what about the ability to reuse templates?

```html
def renderItem(item)
  <li class=item.type id="id-%" % item.id>
    item.name
  </li>
end

def renderList(list)
  <ul>
  for item in list
    renderItem(item)
  end
  </ul>
end

<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with % items" % list.length
    renderList(list)
  </body>
</html>
```

Or you can move them elsewhere:

```html
my_funcs.ipl
============
// render an item
def renderItem(item)
  <li class=item.type id="id-%" % item.id>
    item.name
  </li>
end
// render a list
def renderList(list)
  <ul>
  for item in list
    renderItem(item)
  end
  </ul>
end
```

And then your main template is cleaner

```html
from my_funcs import renderItem, renderList
<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with % items" % list.length
    renderList(list)
  </body>
</html>
```
