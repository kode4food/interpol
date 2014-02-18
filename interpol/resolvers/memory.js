/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (interpol) {
  "use strict";

  interpol.createMemoryResolver = createMemoryResolver;

  function createMemoryResolver(options) {
    var modules = {};

    return {
      resolveModule: resolveModule,
      registerModule: registerModule,
      unregisterModule: unregisterModule
    };

    function resolveModule(name) {
      return modules[name];
    }

    function registerModule(name, module) {
      if ( typeof module === 'function'
        && typeof module.exports === 'function' ) {
        module[name] = module.exports();
        return;
      }

      if ( typeof module === 'string' || typeof module.length === 'number' ) {
        module[name] = interpol(module).exports();
        return;
      }

      if ( typeof module === 'object' ) {
        modules[name] = module;
        return;
      }

      throw new Error("Module not provided");
    }

    function unregisterModule(name) {
      delete modules[name];
    }
  }
})(typeof require === 'function' ? require('../interpol') : $interpol);
