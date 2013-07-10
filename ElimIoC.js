(function (global) {
    "use strict";

    /// <summary>
    /// Service information
    /// </summary>
    var IoCService = function (key, constructor, deps, params, settings) {
        /// <field name='key' type='String'>The type key of this object.</field>
        this.key = key;
        /// <field name='constructor' type='Function'>Object's constructor.</field>
        this.constructor = constructor || null;
        /// <field name='createdByFunc' type='Function'>Alternate function to create object, instead of using the constructor.</field>
        this.createdByFunc = null;
        /// <field name='deps' type='Array[String]'>Array of dependencies to inject.</field>
        this.deps = deps || constructor.prototype.deps;
        /// <field name='params' type='Array[]'>Extra parameters to inject.</field>
        this.params = params || [];
        /// <field name='settings' type='Array[]'>Values to apply to object after creation.</field>
        this.settings = settings || [];
        /// <field name='isSingleton' type='Bool'>Is Singleton.</field>
        this.isSingleton = false;
        /// <field name='instance' type='Object'>Singletones instance.</field>
        this.instance = null;
        /// <field name='postConstructor' type='Bool'>Function to run after object is constructed.</field>
        this.postConstructor = null;
        /// <field name='tracked' type='Bool'>Is Tracked.</field>
        this.tracked = false;
    };

    IoCService.prototype = {
        /**
        * Marks service as a singleton
        * @return this (IoCService)
        */
        asSingleton: function () {
            this.isSingleton = true;
            return this;
        },
        /**
        * Marks service as tracked
        * @return this (IoCService)
        */
        asTracked: function () {
            this.tracked = true;
            return this;
        },
        /**
        * Sets the instance to use, instead of creating one
        * @value {Object} the instance to return when service is resolved
        * @return this (IoCService)
        */
        withInstance: function (value) {
            this.instance = value;
            return this;
        },
        /**
        * Marks service as a singleton
        * @value {Function} Function to run after the constructor
        * @return this (IoCService)
        */
        withPostConstructor: function (value) {
            if (typeof value !== 'function') { throw new Error("postConstructor must be of type function."); }
            this.postConstructor = value;
            return this;
        },
        /**
        * Set of parameters to add into the constructor (after dependencies)
        * @value {Array[Object{name, value}]} 
        * @return this (IoCService)
        */
        withParameters: function (value) {
            this.params = value;
            return this;
        },
        /**
        * Values to set on object after construction
        * @value {Array[Object{name, value}]} 
        * @return this (IoCService)
        */
        withSettings: function (value) {
            this.settings = value;
            return this;
        },
        /**
        * Use this function to create object, instead of the constructor
        * @value {Function}
        * @return this (IoCService)
        */
        createdBy: function (value) {
            this.createdByFunc = value;
            return this;
        }
    };

    /// <summary>
    /// IoCContainer
    /// </summary>
    var IoCContainer = function () {
        /// <field name='serviceRegistered' type='signals.Signal'>Service registered event.</field>
        this.serviceRegistered = new signals.Signal();
        /// <field name='instanceIdCount' type='Number'>Incremental count of instances id.</field>
        this.instanceIdCount = 0;
    };

    IoCContainer.prototype = {

        descriptions: {},
        instances: {},
        serviceAdded: null,

        /**
        * Register an already created object to use as a service
        * @key {String}
        * @instance {Object}
        * @return this (IoCService)
        */
        registerInstance: function (key, instance) {
            var service;
            if (this.hasService(key)) { throw new Error("A service with the key " + key + " has already been registered."); }
            service = new IoCService(key, null, null);
            service.isSingleton = true;
            service.instance = instance;
            this.descriptions[key] = service;

            return service;
        },

        /**
       * Register a service
       * @key {String}
       * @constructor {Function}
       * @deps {Array[]}
       * @params {Array[]}
       * @settings {Array[]}
       * @return this (IoCService)
       */
        register: function (key, constructor, deps, params, settings) {
            var service;
            if (this.hasService(key)) { throw new Error("A service with the key " + key + " has already been registered."); }

            service = new IoCService(key, constructor, deps, params, settings);
            this.descriptions[key] = service;
            this.serviceRegistered.dispatch(service);
            return service;
        },

        /**
       * Resolve a service by its key
       * @key {String}
       * @return {Object}
       */
        resolve: function (key) {
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

                arrayItems.push(this.resolve(deps[i]));
            }

            return arrayItems;
        },

       /**
       * Release a service
       * @instance {Object}
       * @return {None}
       */
        release: function (instance) {
            delete this.instances[instance["IocTrackingKey"]]
        },

       /**
       * Is service registed
       * @key {String}
       * @return {Bool}
       */
        hasService: function (key) {
            return this.descriptions.hasOwnProperty(key);
        },

       /**
       * Current registered service count
       * @return {Number}
       */
        serviceCount: function () {
            var i = 0, prop;
            for (prop in this.descriptions) {
                if (this.descriptions.hasOwnProperty(prop)) { i++; }
            }
            return i;
        },

        /**
        * Current registered service (singleton) count
        * @return {Number}
        */
        singletonCount: function () {
            var i = 0, prop;
            for (prop in this.descriptions) {
                if (this.descriptions.hasOwnProperty(prop)) {
                    if (this.descriptions[prop].isSingleton) { i++; }
                }
            }
            return i;
        }
    };

    global['ioc'] = IoCContainer;
    global['container'] = new IoCContainer();

})(this);
