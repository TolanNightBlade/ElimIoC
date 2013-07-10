(function (global) {

    var IoCService = function (key, constructor, params, settings) {
        this.key = key;
        this.constructor = constructor || null;
        this.createdByFunc = null;
        this.deps = constructor.prototype.deps;
        this.params = params || [];
        this.settings = settings || [];
        this.isSingleton = false;
        this.instance = null;
        this.postConstructor = null;
        this.tracked = false;
    };

    IoCService.prototype = {
        asSingleton: function () {
            this.isSingleton = true;
            return this;
        },
        asTracked: function () {
            this.tracked = true;
            return this;
        },
        withInstance: function (value) {
            this.instance = value;
            return this;
        },
        withPostConstructor: function (value) {
            if (typeof value !== 'function') { throw new Error("postConstructor must be of type function."); }
            this.postConstructor = value;
            return this;
        },
        withParameters: function (value) {
            this.params = value;
            return this;
        },
        withSettings: function (value) {
            this.settings = value;
            return this;
        },
        createdBy: function (value) {
            this.createdByFunc = value;
            return this;
        }
    };

    var IoCContainer = function () {
        this.serviceRegistered = new signals.Signal();
        this.instanceIdCount = 0;
    };

    IoCContainer.prototype = {

        descriptions: {},
        instances: {},
        serviceAdded: null,

        registerInstance: function (key, instance) {
            var service = new IoCService(key, null, null);
            service.isSingleton = true;
            service.instance = instance;
            this.descriptions[key] = service;
            return service;
        },

        register: function (key, constructor, params, settings) {
            var service = new IoCService(key, constructor, params, settings);
            this.descriptions[key] = service;
            this.serviceRegistered.dispatch(service);
            return service;
        },

        create: function (key) {
            var desc = this.descriptions[key],
                instance = desc.instance,
                deps = desc.constructor.prototype.deps || [];

            if (!desc) { throw new Error("IoC Key " + key + " was not found."); }

            if (desc.isSingleton && instance !== null)
            {
                console.log('Singleton exists');
                return desc.instance;
            }

            console.log('create:service', desc);

            if (typeof desc.createdByFunc === 'function') {
                instance = desc.createdByFunc.call(desc.createdByFunc, [desc, this]);
            } else {
                instance = this.createEmptyWithProtoType(desc.constructor);
                desc.constructor.apply(instance, this.createConstructorItems(deps).concat(desc.params));
            }
            if (typeof desc.postConstructor === 'function') {
                desc.postConstructor(instance, desc);
            }

            this.applyParams(instance, desc.settings);

            if (desc.isSingleton) {
                desc.instance = instance;
            } else if (desc.tracked) {
                this.instanceIdCount++;
                instance["IocTrackingKey"] = 'key-' + this.instanceIdCount;
                this.instances[instance["IocTrackingKey"]] = { type: desc.key, instance: instance };
            }

            return instance;
        },

        applyParams: function (instance, items) {
            var i = 0, len = (items ? items.length : 0), item;
            //console.log('Start:applyParams', items, len);
            if (items) {
                for (i; i < len; i = (i + 1)) {
                    item = items[i];
                    if (typeof instance[item.name] === 'function') {
                        instance[item.name].call(instance, item.value);
                    } else {
                        instance[item.name] = item.value;
                    }
                }
            }
            return instance;
        },

        createEmptyWithProtoType: function (constructor) {
            var d = function () { };
            d.prototype = constructor.prototype;
            return new d();
        },

        createConstructorItems: function (deps) {
            var i = 0, len = deps.length, itm, arrayItems = [];

            for (i; i < len; i = (i + 1)) {
                itm = this.descriptions[deps[i]];

                if (!itm) { throw new Error('Unknown service ' + deps[i]); }

                console.log(deps[i], itm);

                arrayItems.push(this.create(deps[i]));
            }

            return arrayItems;
        },

        release: function (instance) {
            delete this.instances[instance["IocTrackingKey"]]
        }
    };

    global['ioc'] = IoCContainer;
    global['container'] = new IoCContainer();

})(this);
