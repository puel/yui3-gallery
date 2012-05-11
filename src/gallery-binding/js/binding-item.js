/**
 * Copyright (c) 2012, Paul Sterl. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */
Y.namespace('Binding');

/**
 * The bind item class is a wrapper for any bind property. We wrapp it here also
 * to itercept nice stuff like Node destroys - this object is now a base object with
 * a destroy propery - which allows us later to act more correct.
 * 
 * @param {Object} config
 * @class BindingItem
 * @namespace Y.Binding
 * @constructor
 * 
 * @param element The element we bind.
 * @param property The property to read - bind
 * @param path the path to use
 */ 
function BindingItem(config){
    BindingItem.superclass.constructor.apply(this, arguments);
}
BindingItem.NAME = "binding-item";
BindingItem.ATTRS = {
    /** 
     * The element we bind.
     * 
     * @type Node|Base
     * @default null
     * @attribute element
     */
    element: {
        value: null,
        setter: function(value){
            if (Lang.isString(value)) {
                value = Y.one(value);
            }
            return value;
        }
    },
    /**
     * The property to read - bind
     * 
     * @type String
     * @default null
     * @attribute property
     */
    property: {
        value: null,
        validator: Lang.isString
    },
    /**
     * The path in the binding widget to popualte
     * 
     * @type String
     * @default null
     * @attribute path
     */
    path: {
        value: null,
        validator: Lang.isString
    },
    /**
     * The event to react on to harvest any changes from the bind element
     * 
     * @type String
     * @default null
     * @attribute event
     */
    event: {
        value: null,
        validator: Lang.isString
    },
    /**
     * Each binding may have a converter
     * 
     * @type Function
     * @default null
     * @attribute converter
     */
    converter: {value: null, validator: Lang.isFunction},
    /** 
     * YUI bind handle, used in the detach method.
     * As YUI still does not correctly detach events we need to store the
     * Event handle to detach us again from any event.
     * 
     * @type Object
     * @default null
     * @attribute handle
     */
    handle: {
        value: null
    },
    binding: {
        value: null
    }
};
Y.extend(BindingItem, Y.Base, {
    initializer: function(config){
        try {
            // TODO: destroy method hook -> as YUI does not correctly always fire the
            // destroy event e.g. Nodes - so we better instrument the destroy method
            // this.bind();
            var element = this.get('element');
            if (Lang.isFunction(element.destroy)) {
                Y.Do.before(this.destroy, element, 'destroy', this);
            } else {
                Y.log('Do destroy method fond on element-> ' + config.element +
                    ' no destroy listener attached!', 'warn', BindingItem.NAME);
            }
        }  catch (e) {
            Y.log('failed to create a new binded item ' + e, 'error', BindingItem.NAME);
        }
    },
    destructor: function() {
        Y.log('Binding destroyed of: ' + this.get('element'), 'debug', BindingItem.NAME);
        this.detach();
        this.detachAll();
    },

    /**
     * Executes the binding again - any binding before will be detached.
     */
    bind: function() {
        var event = this.get('event'), handle;
        this.detach();
        if (event) {
            handle = this.get('element').after(event, this._updateBinding, this);
            this.set('handle', handle);
        }
        return handle;
    },
    /**
     * This method detaches us from the managed element again.
     */
    detach: function(){
        var handle = this.get('handle');
        if (handle) {
            handle.detach();
            this.set('handle', null);
            return true;
        } else {
            return false;
        }
    },
    
    /**
     * Returns the current set value of the element
     */
    getValue: function() {
        return this.get('element').get(this.get('property'));
    },
    
    updateElement: function(value) {
        // first we detach - as we do not want to react on any changes right now
        this.detach();
        var element = this.get('element'),
            property = this.get('property'),
            converter = this.get('converter');
            
        if (converter) {
            value = converter(value, element, this);
        }

        if (element instanceof Y.Node) {
            if (!Lang.isValue(value)) {
                value = "";
            } else {
                // escape for innerHTML - to avoid JS injection
                if (property === 'innerHTML' && value.length > 0 && value.indexOf('<') >= 0) {
                    value = value.replace(/</g, '&lt;');
                }
            }
            // update the element
            element.set(property, value);
        } else {
            element.set(property, value);

//            // check if the widget has transformed the value somehow
//            var widgetValue = element.get(property);
//            if (widgetValue != value && (Lang.isValue(widgetValue) || Lang.isValue(value))) {
//                Y.log('The set value has been transformed by --> ' +
//                     element + ' - to --> ' + widgetValue +
//                     ' setting back to datastore', 'info', BindingItem.NAME);
//                
//                this.get('binding').setData(
//                    widgetValue, 
//                    this.get('path'),
//                    false,
//                    this);
//            }
        }
        
        
        // bind again
        this.bind();
    },
    
    _updateBinding: function(e){
        this.get('binding').setData(
            this.getValue(), 
            this.get('path'),
            false,
            this);
    }
});

Y.Binding.BindingItem = BindingItem;

