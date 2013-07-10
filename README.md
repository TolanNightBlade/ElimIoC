ElimIoC
=======

Very basic javascript IoC

Based upon Injector.js by Skrit, https://gist.github.com/skrat/3551592

Usage

var myContainer = new IoCContainer(); or the global “container”

registerInstance:(key, instance)
register(key, constructor, deps, params, settings)
resolve (key)
release (instance)
hasService (key)
serviceCount () 
singletonCount () 

Dependencies are registered via the services prototype, or container.register(key, constructor, deps, params, settings)

Example prototype

ControllerOne.prototype = { deps: ["repoOne", "logger"] }
Example register

container.register("ControllerOne", ControllerOne, ["repoOne", "logger"], [{ name: "moo", value: "value" }]) .withSettings([{ name: "someSetterFunction", value: "setname" }, { name: "someValue", value:99 }]);
