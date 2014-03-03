/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (interpol) {
  "use strict";

  var globalResolvers = interpol.resolvers()
    , helperResolver = createHelperResolver({});

  interpol.createHelperResolver = createHelperResolver;
  interpol.helperResolver = helperResolver;
  globalResolvers.push(helperResolver);

  // Implementation ***********************************************************

  function createHelperResolver(options) {
    options = options || {};

    var moduleName = options.name || 'helpers'
      , moduleExports = {};

    return {
      resolveModule: resolveModule,
      resolveExports: resolveExports,
      registerHelper: registerHelper,
      unregisterHelper: unregisterHelper
    };

    function resolveModule(name) {
      return null;
    }

    function resolveExports(name) {
      return name === moduleName ? moduleExports : null;
    }

    function registerHelper(name, func) {
      if ( typeof name === 'function' ) {
        func = name;
        if ( !func.name ) {
          throw new Error("Function requires a name");
        }
        name = func.name;
      }
      moduleExports[name] = interpol.bless(func);
    }

    function unregisterHelper(name) {
      if ( typeof name === 'function' ) {
        name = name.name;
      }
      if ( name ) {
        delete moduleExports[name];
      }
    }
  }

})(typeof require === 'function' ? require('../interpol') : this.$interpol);
