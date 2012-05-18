/**
 * Copyright (c) 2012, Paul Sterl. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */
(function (Y) {
    var BindingItem = Y.Binding.BindingItem,
        PropertyUtils = Y.Binding.PropertyUtils,
        NodeUtils = Y.Binding.NodeUtils,
        CLASS_NAME = 'Binding';

    Y.namespace(CLASS_NAME);


    /**
     * DataBinding class constructor
     * @class DataBinding
     * @extends Base
     * @namespace Y.Binding
     * @constructor
     */
    function DataBinding(config){
        DataBinding.superclass.constructor.apply(this, arguments);
    }
    /**
     * Default configuration of the auto binding of values
     * @static
     */
    DataBinding.DefaultBinding = {
        /**
         * An map of elements with custom attribute binding.
         * <br>
         * Fall back is <b>innerHTML</b> and needs not to be specified!
         *
         * @static
         */
        Attributes: {
            input: 'value',
            input_checkbox: 'checked',
            input_radio: 'checked',
            select: 'value',
            textarea: 'value'
        },

        /**
         * An map of auto events bindings for the default HTML elements.
         * <br>
         * <b>Fall back is not to listen at anything -> update only.</b>
         * @static
         */
        Events : {
            input: 'change',
            input_checkbox: 'click',
            input_radio: 'click',
            select: 'change',
            textarea: 'change'
        },

        Converter : {
            // converts a string to a boolean value
            input_checkbox: function(value) {return 'true' == value || 'TRUE' == value;}
        }
    };

    DataBinding.NAME = CLASS_NAME;

    DataBinding.Event = {
        /**
         * If some external code changed a value in the internal data store
         * or any widget/node value is changed this event is fired.
         *
         * Each code may set new data in the "silent" mode which suppresses this event.
         *
         * In addition to this generic "change" event
         *
         * @event Y.Binding.Binding.Event.Change
         * @param <b>path, newValue, prefVal</b>
         */
        Change: 'change',
        /**
         * Fired for each node discovered during the "autoBind"
         */
        NodeToBindFound: "node-to-bind-found",
        /**
         * Event fired then a new element is bind
         */
        Bind: 'bind'
    };

    DataBinding.ATTRS = {

    };
    Y.extend(DataBinding, Y.Base, {
        _localDs: null,

        _bindingMap: null,
        /**
         * @private
         */
        initializer: function() {
            this._bindingMap = {};
            this._localDs = {};

            this.publish(DataBinding.Event.Change, {
                emitFacade: true,
                defaultFn: this._refreshWidgetsHandler, context: this}
            );
            this.publish(DataBinding.Event.NodeToBindFound, {
                emitFacade: true,
                defaultFn: function(e) {this.bind(e.node);}, context: this}
            );
        },
        /**
         * @private
         */
        destructor: function() {
            var key, bindings, i;
            this.detachAll();
            if (this._bindingMap) {
                for (key in this._bindingMap) {
                    bindings = this._bindingMap[key];
                    if (Y.Lang.isArray(bindings)) {
                        for (i = bindings.length - 1; i >= 0; i--){
                            bindings[i].destroy();
                        }
                    }
                }
            }
            this._bindingMap = null;
        },

        bindAll: function(node) {
            if (Y.Lang.isString(node)) {
                node = Y.one(node);
            }
            if (node.hasChildNodes()) {
                node.get('children').each(function (node) {
                    // fire the event - we listen anyway to it :)
                    this.fire(DataBinding.Event.NodeToBindFound, {node: node});
                    // bind any sub childs if needed
                    this.bindAll(node);
                }, this);
            }
        },

        /**
         * Binds a found element
         *
         * @param {Object} element
         */
        bind: function (element) {
            var nodeInfo, bindingPath, attribute, event, nodeName, nodeType, converter;
            if (Y.Lang.isString(element)) {
                element = Y.one(element);
                if (!element) {
                    Y.log("Couldn't find any node with selector: " + element, "warn", CLASS_NAME);
                    return null;
                }
            }
            bindingPath = element.getAttribute('bind');

            if (bindingPath != "" && bindingPath.length > 0) {
                nodeInfo = NodeUtils.inspect(element);
                if (nodeInfo) {
                    attribute = nodeInfo.node.getAttribute('bindAttribute');
                    event = nodeInfo.node.getAttribute('bindEvent');
                    nodeName = nodeInfo.nodeName;
                    nodeType = nodeInfo.nodeType;
                    converter = null;

                    // replace the node with the widget
                    if (nodeInfo.widget) {
                        element = nodeInfo.widget;
                        nodeName = null;
                    } else {
                        element = nodeInfo.node;
                    }
                    if (nodeName) {
                        Y.log('Using default for ' + element + ' which is a ' + nodeName + ' accurate a ' + nodeType, 'debug', DataBinding.NAME);
                        // use first the accurate name then the generic name
                        if (!event) event = DataBinding.DefaultBinding.Events[nodeType];
                        if (!event) event = DataBinding.DefaultBinding.Events[nodeName];
                        if (!attribute) attribute = DataBinding.DefaultBinding.Attributes[nodeType];
                        if (!attribute) attribute = DataBinding.DefaultBinding.Attributes[nodeName];
                        // resolve converter
                        converter = DataBinding.DefaultBinding.Converter[nodeType];
                        if (!converter) converter = DataBinding.DefaultBinding.Converter[nodeName];
                    } else if (nodeInfo.widget) {
                        Y.log('Widget binding detected. ' + nodeInfo.widget.getClassName(), 'debug', DataBinding.NAME);
                    } else {
                        Y.log('No node name found for ' + element, 'warn', DataBinding.NAME);
                    }
                    // fall back check
                    if (!attribute || !Y.Lang.isString(attribute) || attribute.length < 1) {
                        attribute = 'text';
                    }

                    this.bindProperty(element, attribute, bindingPath, event, converter);
                } else {
                    Y.log("bind: failed for element: " + element, "warn", DataBinding.NAME);
                }
            } else {
                Y.log('Node has no "bind" attribute - ignored --> ' + element, 'debug', DataBinding.NAME);
            }
        },

        /**
         * Binds one property to a path
         *
         * @param {Base|Node|String} element the base object or node to bind
         * @param {String} property the property which is access able with get and set
         * @param {String} path the path to use in the DS
         * @param {String} event the event to listen too, empty string "" - read only binding
         * @param {Function} converter a value converter function if needed, executed on set
         */
        bindProperty: function(element, property, path, event, converter){
            if (element && Y.Lang.isString(property) && Y.Lang.isString(path) && (!event || Y.Lang.isString(event))) {
                var domain = PropertyUtils.pathStart(path),
                    i = new BindingItem({
                        element: element,
                        property: property,
                        path: path,
                        event: event,
                        converter: converter,
                        binding: this
                    }),
                    dataValue,
                    elementValue
                ;
                if (!this._bindingMap[domain]) {
                    this._bindingMap[domain] = [];
                }

                this._bindingMap[domain].push(i);

                Y.log('Binding: '
                    + ' element--> ' + element
                    + ' property--> ' + property
                    + ' path--> ' + path
                    + ' event--> ' + event, 'info', DataBinding.NAME);

                // set the initial data
                dataValue = this.getData(path);
                elementValue = i.getValue();

                // we use the DS value if we have something
                if (Y.Lang.isValue(dataValue)) {
                    i.updateElement(this.getData(path));
                } else if (Y.Lang.isValue(elementValue)) {
                    Y.log('Using element value: "' + elementValue +
                        '" from ' + element + ' as start value.',
                        'info', DataBinding.NAME);
                    // if we have something in the element but self nothing get it :)
                    this.setData(elementValue, path, false, i);
                } else {
                    //??? we have nothing and the element also nothing - doing nothing
                }
                i.bind();
                return i;
            } else {
                Y.log('Need at least an element, property and path to perform successfully a binding.\n'
                    + 'element--> ' + element + '\n'
                    + 'property--> ' + property + '\n'
                    + 'path--> ' + path + '\n',
                    + 'event--> ' + event + '\n',
                    'warn', DataBinding.NAME);
            }
        },

        /**
         * Set a new value into the internal data store
         * @param {Object} value the value to set
         * @param {String} path the path to use (optional)
         * @param {Boolean} silent if a update should be triggered, all events are suppressed? (optional = default false)
         * @param {BindingItem} binding the binding to ignore (optional)
         */
        setData: function(value, path, silent, binding) {
            var oldValue, eventObj;
            if (!Y.Lang.isBoolean(silent)) {
                silent = false;
            }
            if (Y.Lang.isString(path)) {
                oldValue = PropertyUtils.getProperty(this._localDs, path);

                // do only if we have really a change
                if (!Y.Lang.isObject(value) && oldValue !== value && (Y.Lang.isValue(oldValue) || Y.Lang.isValue(value))) {

                    PropertyUtils.setProperty(this._localDs, path, value);
                    if (!silent) {
                        eventObj = {newVal: value, prevVal: oldValue, attrName: path, path: path, binding: binding};
                        this.fire(path, eventObj);
                        this.fire(DataBinding.Event.Change, eventObj);
                    }
                }
            } else {
                Y.log("setData: Path is not a string!" , "warn", CLASS_NAME);
            }
        },
        
        /**
         * Parses the given String to an JSON object and sets it into the internal data store.
         * 
         * @param jsonString  
         * @param {String} path the path to use (optional)
         * @param {Boolean} silent if a update should be triggered, all events are suppressed? (optional = default false)
         * @param {BindingItem} binding the binding to ignore (optional)
         */
        setJson: function (jsonString, path, silent, binding) {
            if (Y.Lang.isString(jsonString)) {
                var data = Y.JSON.parse(jsonString);
                this.setData(data, path, silent, binding);
                return data;
            } else {
                throw "Expected String to be parsed to JSON but was--> " + jsonString;
            }
        },

        /**
         * Gets the data to one property from the local data store.
         *
         * @param {String} path the path to use, (optional)
         * @return the data behind this path or all data if null.
         */
        getData: function(path) {
            var result = this._localDs;
            if (Y.Lang.isString(path)) {
                result = PropertyUtils.getProperty(result, path);
            }
            return result;
        },

        _refreshWidgetsHandler : function (e) {
            var domainPath = PropertyUtils.pathStart(e.path),
                bindingToIgnore = e.binding,
                bindings = this._bindingMap[domainPath],
                binding = null,
                i;

            if (Y.Lang.isArray(bindings)) {
                Y.log('Updateting--> ' + bindings.length + ' widgets for path--> ' + e.path, 'debug', CLASS_NAME);
                for (i = 0; i < bindings.length; ++i){
                    binding = bindings[i];
                    if (binding.get('destroyed') === false) {
                        if (binding.get('path') === e.path && bindingToIgnore != binding) {
                            binding.updateElement(e.newVal);
                        }
                    } else {
                        // remove it, if it is destroyed.
                        bindings.splice(i, 1);
                        --i;
                        Y.log('Removing destroyed binding. Items left in area: ' + bindings.length, 'debug', DataBinding.NAME);
                    }
                };
            }
        }
    });
    Y.Binding.DataBinding = DataBinding;
})(Y);