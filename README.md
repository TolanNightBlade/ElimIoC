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
	
IoCService methods
-------

	asSingleton(instance) - returns current instance of IoCService
	asTracked() --
	withInstance(instance) -- use an existing instance of an object, opposed to creating a new one (marks as singleton)
	withDependencies(value) -- modifiy the objects dependencies
	withPostConstructor(value) -- function to run after constructor has been called
	withParameters(value) -- extra parameters to be passed into constructor
	withSettings(value) -- settings to be applied after object is created
	createdBy(value) -- use alternate function to create object

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

	///ControllerOne - has 2 dependencies repoOne and logger
	ControllerOne.prototype = { deps: ["repoOne", "logger"] }
	
	///ControllerOne - has 2 dependencies testRepository of type repoOne and logger
	ControllerOne.prototype =deps: [{ name: "testRepository", value: "repoOne" }, "logger"],

Example register

	container.register("ControllerOne")
		.asSingleton()
		.withSettings([{ name: "someSetterFunction", value: "setname" }, { name: "someValue", value:99 }]);
