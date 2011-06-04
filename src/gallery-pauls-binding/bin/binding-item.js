/**
 * Copyright (c) 2011, Paul Sterl. All rights reserved.
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
 */ 
function BindingItem(config){
    BindingItem.superclass.constructor.apply(this, arguments);
};
BindingItem.NAME = "binding-item";
BindingItem.ATTRS = {
    /** the element we bind */
    element: {
        value: null,
        setter: function(value){
            if (Lang.isString(value)) {
                value = Y.one(value);
            }
            return value;
        }
    },
    property: {
        value: null,
        validator: Lang.isString
    },
    path: {
        value: null,
        validator: Lang.isString
    },
    event: {
        value: null,
        validator: Lang.isString
    },
    /** 
     * YUI bind handle, used in the detach method.
     * As YUI still does not correctly detach events we need to store the
     * Event handle to detach us again from any event.
     * 
     * @type Object
     * @default null
     * @attribute oData
     */
    handle: {
        value: null
    },
    binding: {
        value: null
    }
};
Y.extend(BindingItem, Y.Base, {
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
            property = this.get('property');

        if (element instanceof Node) {
            if (!Lang.isValue(value)) {
                value = "";
            } else {
                // TODO escape for innerHTML
                if (property === 'innerHTML' && value.length > 0 && value.indexOf('<') > 0) {
                    value.replace('<', '&gt;')
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
        
        
        // bin again
        this.bind();
    },
    
    _updateBinding: function(e){
        this.get('binding').setData(
            this.getValue(), 
            this.get('path'),
            false,
            this);
    },
    initializer: function(){
        try {
            // TODO: destroy method hook -> as YUI does not correctly always fire the
            // destroy event e.g. Nodes - so we better instrument the destroy method
            // this.bind();
        }  catch (e) {
            Y.log('failed to create a new binded item ' + e, 'error', BindingItem.NAME);
        }
    },
    destructor: function() {
        this.detachAll();
    }
});

Y.Binding.BindingItem = BindingItem;

