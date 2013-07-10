ElimIoC
-------

Basic javascript IoC

Based upon Injector.js by Skrit, https://gist.github.com/skrat/3551592

QUnit tests included in IoCBaseQunit.html

Usage

var myContainer = new IoCContainer(); or the global “container”

Classes
-------

	IoCContainer - main container class
	IoCService - service item description
	

IoCContainer methods
-------

	registerInstance (key, instance)
	register (key, constructor, deps, params, settings)
	registerSingleton (key, constructor, deps, params, settings)
	remove (key, constructor)
	resolve (key)
	release (instance)
	hasService (key)
	serviceCount () 
	singletonCount ()
	
	findService(key)
	
IoCContainer properties
-------

	descriptions: list of registered services
	instances: tracked object instances
	serviceAdded: event
	names: look up, name and type (support multiple types with a single name)

Dependencies are registered via the services prototype, or container.register(key, constructor, deps, params, settings)

Example prototype

ControllerOne.prototype = { deps: ["repoOne", "logger"] }
Example register

container.register("ControllerOne", ControllerOne, ["repoOne", "logger"], [{ name: "moo", value: "value" }]) .withSettings([{ name: "someSetterFunction", value: "setname" }, { name: "someValue", value:99 }]);
