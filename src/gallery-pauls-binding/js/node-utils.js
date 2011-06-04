var CLASS_NAME = 'NodeUtils',
    NodeUtils = Y.namespace(CLASS_NAME);
    
/**
 * Returns the node informations which may be used for further work in the binding
 * <br>
 * <code>{nodeName: nodeName, nodeType: nodeType, widget: the Widget if it is one}</code>
 * @param {Node|String} node the Node to inspect
 * @return {nodeName: nodeName, nodeType: nodeType, widget: widget}
 */
NodeUtils.inspectNode = function(node) {
    if (!node) {
        return null;
    } else if (Lang.isString(node)) {
        node = Y.one(node);
    }

    var nodeName = NodeUtils.getNormalizedValue(node, 'nodeName');
    var nodeType = NodeUtils.getNormalizedValue(node, 'type');
    var isWidget = node.getAttribute('iswidget');
    var widget = null;
    if (isWidget == 'true') widget = Y.Widget.getByNode(node);
    
    if (nodeName) {
        if (Lang.isString(nodeType) && nodeType.length > 0) {
            nodeType = nodeName + '_' + nodeType;
        } else {
            nodeType = nodeName;
        }
    }
    return {nodeName: nodeName, nodeType: nodeType, widget: widget, node: node};
};

/**
 * Returns the normalized value of the node (lower case strings).
 * 
 * @param {Node} node the node where to get the value
 * @param {String} name the property name
 */
NodeUtils.getNormalizedValue = function(node, name) {
    if (!node) return null;
    
    var value = node.get(name);
    if (Y.Lang.isString(value)) {
        value = value.toLowerCase();
    }
    return value;
};