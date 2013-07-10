ElimIoC
=======

Very basic javascript IoC

Dependencies are registered via the services prototype, or container.register(key, constructor, deps, params, settings)

Example prototype

ControllerOne.prototype = {
            deps: ["repoOne", "logger"]
}

Example register

container.register("ControllerOne", ControllerOne, ["repoOne", "logger"], [{ name: "moo", value: "value" }])
            .withSettings([{ name: "someSetterFunction", value: "setname" }, { name: "someValue", value:99 }]);
