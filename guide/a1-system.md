---
title: A Guide to Interpol
layout: interpol_guide
prev: 10-api
next: index
---
## Appendix: System Modules
The default memory resolver exposes the standard run-time library of Interpol.  This library consists of several modules that provide a variety of functionality.

### list
Provides functionality for manipulating lists.

#### first(array)
Returns the first item of the provided array (or `null` if the array is empty).

#### last(array)
Returns the last item of the provided array (or `null` if the array is empty).

#### length(value)
If it is an array, returns the length of the provided value (otherwise `0`).

#### join([delimiter], array)
Return the result of joining the elements of the provided array.  Each element will be concatenated into a string separated by the specified delimiter (or ' ').

#### empty(array)
Returns true or false depending on whether or not the provided array is empty.

#### keys(value)
Returns the keys of the Object or indexes of the Array passed to it.  If the Array is sparse (has gaps) it will only return the indexes with assigned values.

#### values(value)
Returns the values of the Object or Array passed to it.  If the array is sparse (has gaps) it will only return the assigned values.

### string
Provides functionality for manipulating strings.

#### build(string, supportFunctions)
Converts the provided string into an Interpol interpolation function.

#### lower(string)
Converts the provided string to lower-case and returns the result.

#### upper(string)
Converts the provided string to upper-case and returns the result.

#### title(string)
Converts the provided string to title-case and returns the result.  Title case converts the first character of each word to upper-case, and the rest to lower-case.

#### split([delimiter], string)
Splits the provided string wherever the specified delimiter (or whitespace) is encountered and returns the result.

#### string(value)
Converts the provided value to a string and returns the result.

### math
Provides basic mathematical functions and constants.

#### Constants
| Constant | Description                |
| --------:| ---------------------------|
| E        | Euler's Number             |
| LN2      | Natural Logarithm of 2     |
| LN10     | Natural Logarithm of 10    |
| LOG2E    | Base-2 Logarithm of E      |
| LOG10E   | Base-10 Logarithm of E     |
| PI       | Pi                         |
| SQRT1_2  | The Square Root of 1/2     |
| SQRT2    | The Square Root of 2       |

#### abs(number)
Returns the absolute value of the provided number.

#### acos(number)
Returns the arc-cosine of the provided number (in radians).

#### asin(number)
Returns the arc-sine of the provided number (in radians).

#### atan(y, x)
Returns the arc-tangent of the provided number (in radians).

#### atan2(number)
Returns the arc-tangent of the provided coordinates.

#### avg([number])
Returns the average of the numbers in the provided array.

#### ceil(number)
Rounds the provided number upward to the nearest integer and returns the result.

#### cos(number)
Returns the cosine of the provided number (in radians).

#### exp(x)
Returns E to the power of x, where E is Euler's number.

#### floor
Rounds the provided number downward to the nearest integer and returns the result.

#### log(number)
Returns the natural logarithm of the provided number.

#### max([number])
Returns the maximum value among the numbers in the provided array.

#### median([number])
Returns the mathematical median of the numbers in the provided array.

#### min([number])
Returns the minimum value among the numbers in the provided array.

#### pow(x, y)
Returns x raised to the power of y.

#### random()
Returns a random number between 0 (inclusive) and 1 (exclusive).

#### round(number)
Rounds the provided number to the nearest integer and returns the result.

#### sin(number)
Returns the sine of the provided number (in radians).

#### sqrt(number)
Returns the sqaure root of the provided number.

#### sum([number])
Returns the sum of the numbers in the provided array.

#### tan(number)
Returns the tangent of the provided number (in radians).

#### number(value)
Converts the provided value to a number and returns the result (or NaN).

### render
Provides helper functionality for rendering variable content inside of loops.

#### counter([start, [increment]])
Creates a counter function where the sequence starts at `start` (or 0) and increments by `increment` (or 1).  Each call to the returned function will yield the next value in the sequence.

#### evenOdd([evenValue, [oddValue]])
Creates a boolean toggle generator where the sequence alternates between the `evenValue` (or 'even') and the `oddValue` (or 'odd').  Each call to the returned function will yield the next value in the sequence.

#### separator([separatorValue])
Creates a generator where the sequence begins with an empty value and is followed by `separatorValue` (or ', ').  The first call to the returned function will return an empty string or a noOp function.  Each call thereafter will return the separator.  This means you'd place the call at the beginning of your loop.