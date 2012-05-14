/**
 * Copyright (c) 2012, Paul Sterl. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 */
(function (Y) {
var CLASS_NAME = 'NodeUtils',
    NodeUtils = Y.namespace("Binding." + CLASS_NAME);
/**
 * Returns the node information which may be used for further work in the data binding.
 * <br>
 * <code>{nodeName: nodeName, nodeType: nodeType, widget: the Widget 'iswidget' is set to true on the HTML node}</code>
 * @param {Node|String} node the Node to inspect
 * @return {nodeName: nodeName, nodeType: nodeType, widget: widget}
 */
NodeUtils.inspect = function(node) {
    if (!node) {
        Y.log("Couldn't find any node with selector-->" + node, "warn", CLASS_NAME);
        return null;
    } else if (Y.Lang.isString(node)) {
        node = Y.one(node);
    }

    var nodeName = NodeUtils.getNormalizedValue(node, 'nodeName'),
        nodeType = NodeUtils.getNormalizedValue(node, 'type'),
        isWidget = (node.getAttribute('iswidget') == 'true'),
        widget = isWidget ? Y.Widget.getByNode(node) : null;
    
    if (nodeName) {
        if (Y.Lang.isString(nodeType) && nodeType.length > 0) {
            nodeType = nodeName + '_' + nodeType;
        } else {
            nodeType = nodeName;
        }
    }
    return {nodeName: nodeName, nodeType: nodeType, widget: widget, node: node};
}

/**
 * Returns the normalized value of the node (lower case strings).
 * 
 * @param {Node} node the node where to get the value
 * @param {String} name the property name
 */
NodeUtils.getNormalizedValue = function(node, name) {
    if (!node) {
        return null;
    }
    
    var value = node.get(name);
    if (Y.Lang.isString(value)) {
        value = value.toLowerCase();
    }
    return value;
}
})(Y);