---
layout: post
title: Why Interpol?
author: Thom
---
I've come to a point in my career where clever tricks and being able to pack a huge punch in a one liner have lost their allure.  Long gone are the days when I was concerned with impressing myself with my ability to code circles around others.  As I revisit my code from days and years past, and as I'm now in a position where I have to review the code of others, I'm often left quite disappointed by a glaring lack of something.

That something is 'meaning'.

Things you do should 'mean' something.  If your job means nothing to you, then why are you doing it?  And in your job as a developer, the stuff you write should also mean something.  Not only at the time it's written, but years later.  It should also mean something to new eyes and to a layperson.  If you can't understand code you wrote in the past, why assume someone else  has a chance of understanding it today?

## Enter Interpol
Driven by this search for meaning, I began to develop Interpol.  That said, its goals are modest.  It should:

  * Provide templates where *meaning* takes a front seat
  * Work well in both Node.js and the Browser

Also, it *does not* participate in the member-measuring and micro-optimization that seem to be so important to some developers.  Specifically, Interpol has:

  * No desire to have the 'smallest' minified footprint
  * No desire to be the 'fastest' template processor

Interpol will be as *small* and *fast* as possible, but no more, especially if those considerations would require compromising the aforementioned goal of providing *meaning*.

## An Example
So, assuming you know some HTML, take a look at this Interpol template to understand what I suggest by *meaning*:

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
  for field in ['name', 'address', 'telephone']
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
    for field in ['name', 'address', 'telephone']
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
    for field in ['name', 'address', 'telephone']
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
