(function (global, signals) {
    "use strict";

    function isKind(val, kind) {
        return '[object ' + kind + ']' === Object.prototype.toString.call(val);
    }

    function arrayToObject(settings) {
        var data = {}, i = 0, len = settings.length;

        for (i; i < len; i = (i + 1)) {
            data[settings[i].name] = settings[i].value;
        }

        return data;
    }

    function combineSettings(base, extra)
    {
        var i, len, item;

        if (!base) { return null;}
        if (isKind(base, 'Array')) { base = arrayToObject(base); }

        if (extra) {
            i = 0;
            len = extra.length;
            for (i; i < len; i = (i + 1)) {
                base[extra[i].name] = extra[i].value;
            }
        }
        return base;
    }

    /// <summary>
    /// Service information
    /// </summary>
    var IoCService = function (name, key, constructor, deps, params, settings) {
        /// <field name='name' type='String'>The type name of this object.</field>
        this.name = name;
        /// <field name='key' type='String'>The type key of this object.</field>
        this.key = key;
        /// <field name='constructor' type='Function'>Object's constructor.</field>
        this.constructor = constructor || null;
        /// <field name='createdByFunc' type='Function'>Alternate function to create object, instead of using the constructor.</field>
        this.createdByFunc = null;
        /// <field name='deps' type='Array[String]'>Array of dependencies to inject.</field>
        this.deps = {};
        //this.deps = deps || constructor.prototype.deps || [];
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
        /// <field name='dontCreate' type='Bool'>Do not create (used when instance is manually set).</field>
        this.dontCreate = false;

        if (constructor) { this.combineDeps(constructor.prototype.deps); }
        if (deps) { this.combineDeps(deps); }
    };

    IoCService.prototype = {
        combineDeps: function (deps) {
            var i = 0, len, currentDep;
            if (!deps) { return; }
            len = deps.length;
            for (i; i < len; i = (i + 1)) {
                if (typeof deps[i] === 'string') {
                    currentDep = { name: deps[i], value: deps[i] };
                } else {
                    currentDep = deps[i];
                }
                this.deps[currentDep.name] = currentDep.value;
            }
        },
        /**
        * Marks service as a singleton
        * @return this (IoCService)
        */
        asSingleton: function (instance) {
            this.isSingleton = true;
            if (instance) { this.withInstance(instance);}
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
            this.dontCreate = true;
            this.instance = value;
            return this;
        },
        /**
        * Sets objects dependencies
        * @value {Array[String]} dependencies to use
        * @return this (IoCService)
        */
        withDependencies: function (value) {
            this.combineDeps(value);
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
            this.params = value || [];
            return this;
        },
        /**
        * Values to set on object after construction
        * @value {Array[Object{name, value}]} 
        * @return this (IoCService)
        */
        withSettings: function (value) {
            this.settings = value || [];
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
        /// <field name='instanceIdCount' type='Number'>Incremental count of instance id.</field>
        this.instanceIdCount = 0;
    };

    IoCContainer.prototype = {

        descriptions: {},
        names: {},
        instances: {},
        serviceAdded: null,

        /**
        * Register an already created object to use as a service
        * @key {String}
        * @instance {Object}
        * @return this (IoCService)
        */
        registerInstance: function (key, instance) {
            var service = this.register(key)
                .withInstance(instance);

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
            var service, _key = key + '@', constructorName = this.constructorName(constructor);

            _key += constructorName;
            
            if (this.hasService(_key)) { throw new Error("A service with the key " + _key + " has already been registered."); }

            service = new IoCService(key, _key, constructor, deps, params, settings);
            this.descriptions[_key] = service;
            if (!this.names.hasOwnProperty(key)) { this.names[key] = {}; }
            this.names[key][constructorName] = constructorName;
            this.serviceRegistered.dispatch(service);
            return service;
        },

        /**
        * Register service as a singleton
        * @key {String}
        * @constructor {Function}
        * @deps {Array[]}
        * @params {Array[]}
        * @settings {Array[]}
        * @return this (IoCService)
        */
        registerSingleton: function(key, constructor, deps, params, settings){
            return this.register(key, constructor, deps, params, settings)
                .asSingleton();
        },

        /**
        * Remove a service by key
        * @key {String}
        * @constructor {Function}
        * @return {Object}
        */
        remove: function (key, constructor) {
            var _key = key + '@';

            if (constructor) {
                if (typeof constructor.name === 'function') { _key += constructor.name(); }
                else { _key += constructor.name; }
            }

            this.descriptions[_key] = null;
            delete this.descriptions[_key];
        },

        /**
       * Resolve a service by key, if not found try to find the default service
       * @key {String}
       * @return {Object}
       */
        findService: function(key){
            var desc = this.descriptions[key], _key = key, prop, splitIndex;
            if(desc){ return desc;}

            splitIndex = key.indexOf('@');
            if (splitIndex > -1) {
                _key = key.substring(0, key.indexOf('@') + 1);
            }
            
            for (prop in this.descriptions) {
                if (this.descriptions.hasOwnProperty(prop) && prop.indexOf(_key) === 0) {
                    return this.descriptions[prop];
                }
            }
            return null;
        },

        constructorName: function (item) {
            if (typeof item === 'string') { return item; }
            if (item) {
                if (typeof item.name === 'function') { return item.name(); }
                else { return item.name; }
            }
        },

        /**
        * Resolve a service by its key
        * @key {String}
        * @return {Object}
        */
        resolve: function (key, type, settings, subItem) {
            var _key = key + '@' + (type ? this.constructorName(type) : key);
            return this._resolve(_key, settings, subItem);
        },

       /**
       * Resolve a service by its key, pass settings
       * @key {String}
       * @settings {Array[Object]}
       * @return {Object}
       */
        resolveWithSettings: function (key, settings) {
            return this.resolve(key, null, settings, false);
        },

        _resolve: function (key, settings, subItem) {
            var desc = this.findService(key),
                instance = desc.instance,
                deps = desc.deps;

            if (!desc) { throw new Error("IoC Key " + key + " was not found."); }

            if (desc.dontCreate || (desc.isSingleton && instance !== null))
            {
                return desc.instance;
            }

            if (typeof desc.createdByFunc === 'function') {
                instance = desc.createdByFunc.call(desc.createdByFunc, [desc, this]);
            } else {
                instance = this.createEmptyWithProtoType(desc.constructor);
                desc.constructor.apply(instance, this.createConstructorItems(deps).concat(desc.params));
            }
            if (typeof desc.postConstructor === 'function') {
                desc.postConstructor(instance, desc);
            }

            this.applyParams(instance, combineSettings(desc.settings, settings));

            if (desc.isSingleton) {
                desc.instance = instance;
            } else if (desc.tracked) {
                this.instanceIdCount++;
                instance.IocTrackingKey = 'key-' + this.instanceIdCount;
                this.instances[instance.IocTrackingKey] = { type: desc.key, instance: instance };
            }

            return instance;
        },

        applyParams: function (instance, items) {
            var prop;
            //console.log('applyParams', items);
            if (items) {
                for (prop in items) {
                    if (items.hasOwnProperty(prop)) {
                        if (typeof instance[prop] === 'function') {
                            instance[prop].call(instance, items[prop]);
                        } else {
                            instance[prop] = items[prop];
                        }
                    }
                }
            }
            return instance;
        },

        ///<summary>
        ///Create an empty object with the correct prototype
        ///</summary>
        createEmptyWithProtoType: function (constructor) {
            var D = function () { };
            D.prototype = constructor.prototype;
            return new D();
        },

        createConstructorItems: function (deps) {
            var prop, arrayItems = [], itm;

            for (prop in deps) {
                if (deps.hasOwnProperty(prop)) {
                    arrayItems.push(this._resolve(prop+'@'+deps[prop], null, true));
                }
            }

            return arrayItems;
        },

       /**
       * Release a service
       * @instance {Object}
       * @return {None}
       */
        release: function (instance) {
            /*jshint -W069 */
            delete this.instances[instance["IocTrackingKey"]];
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

    /*jshint -W069 */
    global['ioc'] = IoCContainer;
    /*jshint -W069 */
    global['container'] = new IoCContainer();
    
})(this, this.signals);