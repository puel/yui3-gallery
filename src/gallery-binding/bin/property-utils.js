/**
 * Copyright (c) 2011, Paul Sterl. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */
var CLASS_NAME = 'PropertyUtils',
    PropertyUtils = Y.namespace(CLASS_NAME),
    Lang = Y.Lang,
    Base = Y.Base,
    Widget = Y.Widget;

/**
 * As we fight always some different patch we have this normalize.
 * 
 * @param {String} path the path to normalize
 */
PropertyUtils.cleanPath = function (path) {
    var result = path;
    if (Y.Lang.isString(path)) {
        result = path.replace('[', '.').replace(']', '').split('.');
    } else {
        // maybe it is already an array?
        if (!Y.Lang.isArray(path)) {
            Y.log('cleanPath: path is not a string, but it should be one!', 'warn', CLASS_NAME);
        } else {
            Y.log('The path is already an array!', 'info', CLASS_NAME);
        }
    }
    return result;
};

/**
 * Returns the first chunk of the path
 * @param {String} path
 * @return {String} first chunk of the path
 */
PropertyUtils.pathStart = function(path) {
    return PropertyUtils.cleanPath(path)[0];
};

/**
 * This method allows you to access any property of a
 * object by using the point notation.
 * <br>
 * <i>e.g. foo.person.address.street</i>
 * <br>
 * @param object the object where to ge the data
 * @param dataPath e.g foo.person.address.street
 * @return The value on the given position
 */
PropertyUtils.getProperty = function(object, dataPath){
    var result = object, path, i;
    if (Lang.isString(dataPath) && dataPath.length > 0) {
        path = PropertyUtils.cleanPath(dataPath);
        // navigate to the desired point
        for (i = 0; i < path.length && Lang.isValue(result); ++i) {
            result = result[path[i]];
        }
    } else {
        Y.log('getProperty: path is not a String, or empty!', 'warn', CLASS_NAME);
    }
    return result;
};

/**
 * This function allows you to set any value by using the point notation.
 * <br>
 * e.g. foo.person.adress.street = some object
 *
 * @param {Object} the obj where the property should be set, or null
 * @param {String} dataPath e.g. obj.person.adress.street
 * @param {Object} value some value which should be set
 * @return {Object} the given object with the set value
 */
PropertyUtils.setProperty = function(object, dataPath, value){
    var result = object || {}, path, current, i, buildTo;
    
    if (Lang.isString(dataPath) && dataPath.length > 0) {
        path = dataPath.split('.');
        current = result;
        // navigate to the desired object
        buildTo = path.length - 1;
        for (i = 0; i < buildTo; ++i) {
            // is the property not available, create it
            if (current[path[i]] === undefined) {
                // okay if we create a new object we need to check 
                // if the next navigation is a number so we need a array
                if ((1 + i < buildTo) && !isNaN(path[1 + i])) {
                    // array
                    current[path[i]] = [];
                } else {
                    current[path[i]] = {};
                }
            }
            // get to the next property
            current = current[path[i]];
        }
        //--> set the value in the desired object
        current[path[buildTo]] = value;
    } else {
        Y.log('setProperty: dataPath is invalid! -->' + dataPath, 'warn', CLASS_NAME);
        result = value;
    }
    return result;
};