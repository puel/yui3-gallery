/**
 * Copyright (c) 2011, Paul Sterl. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */
Y.namespace('Binding');

/**
 * DataBinding class constructor 
 * @class DataBinding
 * @extends Base
 * @namespace Merlins
 * @constructor
 * @param ds global scope patch - work in progress
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
    }
};
    
DataBinding.NAME = "binding";
/** Global DS BETA only a JS object */
DataBinding.GlobalDs = {};

DataBinding.Event = {
    /** 
     * If some external code changed a value in the internal data store
     * or any widget/node value is changed this event is fired.
     *
     * Each code may set new data in the "silent" mode which suppresses this event.
     *
     * @event Y.Binding.Binding.Event.NewValueSet
     * @param <b>path, value</b>
     */
    NewValueSet: 'new-value-set',
    
    NodeToBindFound: "node-to-bind-found"
};

DataBinding.ATTRS = {
    /** String name of the globa DS to use them in the local scope */
    ds: {
        value: null
    }
};
Y.extend(DataBinding, Base, {
    _localDs: null,

    _bindingMap: null,
    /**
     * @private
     */
    initializer: function() {
        var ds = this.get('ds');
        if (ds) {
            if (!DataBinding.GlobalDs[ds]) {
                DataBinding.GlobalDs[ds] = this._localDs = {};
            } else {
                this._localDs = DataBinding.GlobalDs[ds];
            }
            Y.log("New binding in Global scope --> " + ds, "debug", DataBinding.NAME);
        } else {
            this._localDs = {};
            Y.log("New binding in local scope.", "debug", DataBinding.NAME);
        }
        this._bindingMap = {};
        
        this.publish(DataBinding.Event.NewValueSet, {emitFacade: true,
                defaultFn: this._refreshWidgetsHandler, context: this});
        this.publish(DataBinding.Event.NodeToBindFound, {emitFacade: true,
            defaultFn: function(e) {this.bind(e.node)}, context: this});
    },
    /**
     * @private
     */
    destructor: function() {
        var key, bindings, i;
        
        this._localDs = null;
        this.detachAll();
        if (this._bindingMap) {
            for (key in this._bindingMap) {
                bindings = this._bindingMap[key];
                if (Y.Lang.isArray(bindings)) {
                    for (i = bindings.length - 1; i >= 0; i--){
                        bindings[i].destroy();
                    };
                }
            }
        }
        this._bindingMap = null;
    },
    
    bindAll: function(node) {
        if (Lang.isString(node)) {
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
        if (Lang.isString(element)) {
            element = Y.one(element);
            if (node == null) {
                Y.log("Couldn't find any node with selector: " + element, "warn", DataBinding.NAME);
                return null;
            }
        }
        var bindingPath = element.getAttribute('bind');
        
        if (bindingPath != "" && bindingPath.length > 0) {
            var nodeInfo = NodeUtils.inspectNode(element);
            if (nodeInfo) {
                var attribute = nodeInfo.node.getAttribute('bindAttribute'),
                    bindEvent = nodeInfo.node.getAttribute('bindEvent'),
                    nodeInfo = NodeUtils.inspectNode(element),
                    nodeName = nodeInfo.nodeName,
                    nodeType = nodeInfo.nodeType,
                    event = null;
                // replace the node with the widget
                if (nodeInfo.widget) {
                    element = nodeInfo.widget;
                    nodeName = null;
                } else {
                    element = nodeInfo.node;
                }
                if (nodeName) {
                    Y.log('Using default for ' + element + ' which is a ' + nodeName + ' accurat a ' + nodeType, 'debug', DataBinding.NAME);
                    // use first the accurate name then the generic name
                    if (!event) event = DataBinding.DefaultBinding.Events[nodeType];
                    if (!event) event = DataBinding.DefaultBinding.Events[nodeName];
                    if (!attribute) attribute = DataBinding.DefaultBinding.Attributes[nodeType];
                    if (!attribute) attribute = DataBinding.DefaultBinding.Attributes[nodeName];
                } else if (nodeInfo.widget) {
                    Y.log('Widget binding detected. ' + nodeInfo.widget.getClassName(), 'debug', DataBinding.NAME);
                } else {
                    Y.log('No node name found for ' + element, 'warn', DataBinding.NAME);
                }
                // fall back check
                if (!attribute || !Lang.isString(attribute) || attribute.length < 1) {
                    attribute = 'innerHTML';
                }

                this.bindProperty(element, attribute, bindingPath, event);
            } else {
                Y.log("bind: failed for element: " + element, "warn", DataBinding.NAME);
            }
        } else {
            Y.log('Node has no "bind" attribute - ignored --> ' + element, 'debug', DataBinding.NAME);
        }
    },

    /**
     * Binds one propery to a path
     * 
     * @param {Base|Node|String} element the base object or node to bind
     * @param {String} property the property which is accessable with get and set
     * @param {String} path the path to use in the DS
     * @param {String} event the event to listen too, empty string "" - read only binding
     */
    bindProperty: function(element, property, path, event){
        if (element && Lang.isString(property) && Lang.isString(path) && (!event || Lang.isString(event))) {
            var domain = PropertyUtils.pathStart(path),
                i = new BindingItem({
                element: element,
                property: property,
                path: path,
                event: event,
                binding: this
            });
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
            var dataValue = this.getData(path),
                elementValue = i.getValue();
            
            // we use the DS value if we have something
            if (Lang.isValue(dataValue)) {
                i.updateElement(this.getData(path));
            } else if (Lang.isValue(elementValue)) {
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
     * @param {String} path the path to use
     * @param {Boolean} silent if a update should be triggered?
     */
    setData: function(value, path, silent, binding) {
        if (!Lang.isBoolean(silent)) {
            silent = false;
        }
        if (Lang.isString(path)) {
            var oldValue = PropertyUtils.getProperty(this._localDs, path);
            
            // do only if we have really a change
            if (oldValue !== value && (Lang.isValue(oldValue) || Lang.isValue(value))) {
                PropertyUtils.setProperty(this._localDs, path, value);
                if (!silent) {
                    this.fire(DataBinding.Event.NewValueSet, {value: value, path: path, binding: binding});
                }
            }
        } else {
            Y.log("setData: Path is not a string!" , "warn", DataBinding.NAME);
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
        if (Lang.isString(path)) {
            result = PropertyUtils.getProperty(result, path, result);
        }
        return result;
    },
    
    _refreshWidgetsHandler : function (e) {
        var domainPath = PropertyUtils.pathStart(e.path),
            bindingToIgnore = e.binding,
            bindings = this._bindingMap[domainPath],
            binding = null;
        
        if (Lang.isArray(bindings)) {
            Y.log('Updateting--> ' + bindings.length + ' widgets for path--> ' + e.path, 'debug', DataBinding.NAME);
            for (var i = bindings.length - 1; i >= 0; i--){
                binding = bindings[i];
                if (binding.get('path') === e.path) {
                    binding.updateElement(e.value);
                }
            };
        }
    }
});
Y.Binding.DataBinding = DataBinding;
