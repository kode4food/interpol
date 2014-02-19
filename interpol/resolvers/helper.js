/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (interpol) {
  "use strict";

  interpol.createHelperResolver = createHelperResolver;

  function createHelperResolver(options) {
    options = options || {};

    var moduleName = options.name || 'helpers'
      , module = {};

    return {
      resolveModule: resolveModule,
      registerHelper: registerHelper,
      unregisterHelper: unregisterHelper
    };

    function resolveModule(name) {
      return name === moduleName ? module : null;
    }

    function registerHelper(name, func) {
      if ( typeof name === 'function' ) {
        func = name;
        if ( !func.name ) {
          throw new Error("Function requires a name");
        }
        name = func.name;
      }
      func._interpolPartial = true;
      module[name] = func;
    }

    function unregisterHelper(name) {
      if ( typeof name === 'function' ) {
        name = name.name;
      }
      if ( name ) {
        delete module[name];
      }
    }
  }
})(typeof require === 'function' ? require('../interpol') : $interpol);
