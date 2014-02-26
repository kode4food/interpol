/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

function extend(target) {
  for ( var i = 1, len = arguments.length; i < len; i++ ) {
    var src = arguments[i];
    if ( !src ) {
      continue;
    }
    for ( var key in src ) {
      if ( !src.hasOwnProperty(key) ) {
        continue;
      }
      target[key] = src[key];
    }
  }
  return target;
}

// Exports
exports.extend = extend;
