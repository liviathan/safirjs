/**
 *
 */
class SafirTemplateContext {
    /**
     * Create a new context instance
     * @param data
     */
    constructor(data) {
        this.data = data || {};
    }

    /**
     *
     * @param name
     * @returns {*|{}}
     */
    get(name) {
        let paths = name.split('.');
        let current = this.data;
        while (paths.length > 0) {
            let key = paths.shift();
            current = current[key];
            if (current === undefined) {
                break;
            }
        }
        return current;
    }

    /**
     *
     * @param name
     * @param value
     */
    set(name, value) {
        this.data[name] = value;
    }
}

/**
 *
 */
class SafirTemplateNode {
    constructor(parent) {
        this.parent = parent;
        this.children = [];
        this.content = '';
        this.tmpl_attributes = new Map();
        this.html_attributes = new Map();
        this.context = new SafirTemplateContext();
        this.append_data = false;
    }

    /**
     *
     * @param child
     */
    addChild(child) {
        if ((child.type !== Node.TEXT_NODE) || (child.content.length > 0)) {
            child.parent = this;
            this.children.push(child);
        }
    }

    render(parent, data) {

        this.context = new SafirTemplateContext(data);

        let processor;

        switch (this.type) {
            case Node.ELEMENT_NODE:
                if (this.prefix === SafirTemplate.prefix) {
                    // Find a template tag processor
                    let _class = SafirTemplateProcessor.getTag(this.name);
                    if (_class !== undefined) {
                        processor = new _class();
                    }
                } else {
                    processor = new SafirHtmlTagProcessor();
                }
                processor.process(this, parent);
                break;

            case Node.TEXT_NODE:
                processor = new SafirTextElementProcessor();
                processor.process(this, parent);
                break;

            case Node.CDATA_SECTION_NODE:
                // @TODO Implement CDATA processing
                break;
            default:
                processor = new SafirHtmlTagProcessor();
                processor.process(this, parent);
                break;
        }
    }

    clone() {
        let node = new SafirTemplateNode(this.parent);
        node.name = this.name;
        node.prefix = this.prefix;
        node.type = this.type;

        // Deep clone all children
        this.children.forEach(child => {
            node.addChild(child.clone());
        });

        node.content = this.content;

        this.tmpl_attributes.forEach((value, key) => {
            node.tmpl_attributes.set(key, value);
        });
        this.html_attributes.forEach((value, key) => {
            node.html_attributes.set(key, value);
        });
        node.context = new SafirTemplateContext(this.context.data);
        return node;
    }

    get(name) {
        if (name === '*') {
            return this.context.data;
        }

        let data = this.context.get(name);
        if (data === undefined) {
            if (this.parent === undefined) {
                console.error('this.parent', name);
            }
            data = this.parent.get(name);
        }
        return data;
    }

    data() {
        let _data = {};

        if (this.parent !== undefined) {
            _data = this.parent.data();
        }
        for (let name in this.context.data) {
            _data[name] = this.context.data[name];
        }
        return _data;
    }
}
/**
 *
 */
class SafirTemplateParser {

    /**
     *
     */
    constructor() {
        this.children = [];

    }

    /**
     *
     * @param selector
     */
    parse(selector) {
        let element = null;
        if (selector instanceof Element) {
            element = selector;
        } else {
            element = document.querySelector(selector);
        }


        let node = new SafirTemplateNode();
        let nodes = element.content.childNodes;
        this.parseChildNodes(node, nodes);
        // console.log(node);
        return node;
    }

    /**
     *
     * @param parent
     * @param children
     */
    parseChildNodes(parent, children) {
        let parser = this;
        children.forEach(function (dom, index) {
            let node = new SafirTemplateNode(parent);
            parser.parseNode(parent, node, dom);
        });
    }

    /**
     *
     * @param parent
     * @param node
     * @param dom_node
     */
    parseNode(parent, node, dom) {
        node.type = dom.nodeType;
        switch (node.type) {
            case Node.ELEMENT_NODE:
                this.parseTagName(node, dom.localName);
                for (let j = 0; j < dom.attributes.length; j++) {
                    this.parseAttributes(dom.attributes[j], node);
                }
                this.parseChildNodes(node, dom.childNodes);
                parent.addChild(node);
                break;
            case Node.TEXT_NODE:
                let text = dom.textContent.trim();
                if (text.length > 0) {
                    node.innerHTML = text;
                    parent.addChild(node);
                }
                break;
            case Node.CDATA_SECTION_NODE:
                node.innerHTML = dom.nodeValue;
                parent.addChild(node);
                break;
        }
    }

    /**
     *
     * @param node
     * @param name
     */
    parseTagName(node, name) {
        const names = name.split(':');
        if (names.length > 1) {
            node.name = names[1];
            node.prefix = names[0];
        } else {
            node.name = names[0];
            node.prefix = false;
        }
    }

    /**
     *
     * @param attr
     * @param node
     */
    parseAttributes(attr, node) {
        const names = attr.localName.split(':');
        if (names.length > 1) {
            node.tmpl_attributes.set(names[1], attr.value);
        } else {
            node.html_attributes.set(names[0], attr.value);
        }
    }
}
class SafirTemplateProcessor {

    /**
     *
     * @type {{}}
     * @private
     */
    static _tag_registry = {};

    /**
     *
     * @type {{}}
     * @private
     */
    static _attr_registry = {};

    static getAttr(name) {
        if (SafirTemplateProcessor._attr_registry.hasOwnProperty(name)) {
            return SafirTemplateProcessor._attr_registry[name];
        } else {
            // console.warn('No processor found for attribute: ' + name);
            return undefined;
        }
    }

    static registerAttr() {
        for (let i = 0; i < arguments.length; i++) {
            let processor = arguments[i];
            let name = processor._name;
            if (name !== undefined) {
                if (!SafirTemplateProcessor._attr_registry.hasOwnProperty(name)) {
                    SafirTemplateProcessor._attr_registry[name] = processor;
                } else {
                    console.log('Processor for attribute [' + SafirTemplate.prefix + ':' + name + '] already registered. Ignoring current request.');
                }
            } else {
                console.error('Attribute processor must set static _name value');
            }
        }
    }

    static getTag(name) {
        if (SafirTemplateProcessor._tag_registry.hasOwnProperty(name)) {
            return SafirTemplateProcessor._tag_registry[name];
        } else {
            console.error('No processor found for tag: ' + name);
            return undefined;
        }
    }

    static registerTag() {

        for (let i = 0; i < arguments.length; i++) {
            let processor = arguments[i];
            let name = processor._name;
            if (name !== undefined) {
                if (!SafirTemplateProcessor._tag_registry.hasOwnProperty(name)) {
                    SafirTemplateProcessor._tag_registry[name] = processor;
                } else {
                    console.log('Processor for tag [' + SafirTemplate.prefix + ':' + name + '] already registered. Ignoring current request.');
                }
            } else {
                console.error('Tag processor must set static _name value');
            }
        }
    }
}

/**
 *
 */
class SafirTemplate {
    /**
     *
     * @type {string}
     */
    static prefix = 'sf';

    /**
     *
     * @type {string}
     */
    static namespace = 'https://github.com/safirjs/safirjs';

    /**
     *
     * @param selector
     */
    constructor(selector) {
        let parser = new SafirTemplateParser();

        if (selector instanceof Element) {
            this.tpl_element = selector;
        } else {
            this.tpl_element = document.querySelector(selector);
        }

        // get listeners

        let attr = this.tpl_element.getAttribute(SafirTemplate.prefix + ':listener');
        if(attr !== null) {
            this.listener = SafirRegistry.get(attr);
            if (this.listener !== null) {
                let event_target = new SafirEventTarget(this.tpl_element);
                event_target.addEventListener(this.listener);

            } else {
                console.error('%cListener [' + attr + '] not found. %cPlease add: %cSafirRegistry.add(' + attr + '); %cin your code'
                    , 'color:red;', 'color:black;', 'color:blue; font-weight:bold;', 'color:black;');
            }
        }
        this.node = parser.parse(this.tpl_element);
    }

    /**
     * Render this template inside the target DOM element
     * @param target
     * @param data
     */
    render(target, data) {

        if (!(target instanceof Element)) {
            target = document.querySelector(target);
        }

        this.node.render(target, data);
        safir.core.init(target);

        this.tpl_element.dispatchEvent(new CustomEvent('tmpl_rendered', {detail: data}));
    }
}
class SafirBaseProcessor {

    /**
     *
     * @param value
     * @returns {*}
     */
    evalString(value, node) {
        const regex = /{{([^}]+)}}/g;
        let original_value = value;
        let matches = value.match(regex);
        if (matches && matches.length > 0) {
            for (let i = 0; i < matches.length; i++) {
                let match = matches[i];
                let key = match.substring(2, match.length - 2).trim();
                let context_value = node.get(key);
                value = value.replace(match, context_value);
            }
        }
        return (value !== undefined) ? this.nl2br(value) : original_value;
    }

    nl2br (string) {
        let breakTag = '<br/>';
        return (string + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
    }
}

class SafirConditionalProcessor extends SafirBaseProcessor {
    process_if(node, target, parent_processor, value, test) {
        if (value === test) {
            if (parent_processor !== undefined) {
                parent_processor.process(node, target);
            } else {
                let dom = new DocumentFragment();
                node.children.forEach(element => {
                    element.render(dom);
                });
                target.appendChild(dom);
            }
        }
    }
}


/**
 * Attache current context data to the DOM element
 */
class SafirDataAttributeProcessor extends SafirBaseProcessor {
    static _name = 'attach-data';

    process(node, target, parent_processor) {
        // Delete this to prevent infinite loop
        node.tmpl_attributes.delete(SafirDataAttributeProcessor._name);
        node.append_data = true;
        parent_processor.process(node, target);
    }
}
/**
 * HTML Tag processors
 */
class SafirHtmlTagProcessor extends SafirBaseProcessor {
    process(node, parent, parent_processor) {
        let processors = [];

        for (let [name, value] of node.tmpl_attributes) {
            let processor = SafirTemplateProcessor.getAttr(name);
            if (processor !== undefined) {
                // node.tmpl_attributes.delete(name);
                processors.push(processor);
            }
        }

        if (processors.length === 0) {
            let dom;
            if (node.name) {
                dom = document.createElement(node.name);
            } else {
                dom = new DocumentFragment();
            }

            let attr_processor = new SafirAttributeProcessor();
            attr_processor.process(node, dom);

            for (let i = 0; i < node.children.length; i++) {
                node.children[i].render(dom);
            }

            // Append custom data
            if (node.append_data) {
                let _data = node.data();
                Object.defineProperty(dom, 'attached_data', {
                    value: _data,
                    writable: false
                });
            }

            parent.appendChild(dom);
        } else {
            if (parent_processor === undefined) {
                parent_processor = this;
            }

            processors.forEach(processor => {
                let instance = Reflect.construct(processor, []);
                instance.process(node, parent, parent_processor);
                // Once processing is done, the attribute must be deleted to prevent infinite loop
                node.tmpl_attributes.delete(processor._name);
            });
        }
    }
}

class SafirAttributeProcessor extends SafirBaseProcessor {
    process(node, target, parent_processor) {
        for (let [name, value] of node.html_attributes) {
            let attr_value = this.evalString(value, node);
            target.setAttribute(name, attr_value);
        }
        for (let [name, value] of node.tmpl_attributes) {
            let attr_value = this.evalString(value, node);
            target.setAttribute(SafirTemplate.prefix + ':' + name, attr_value);
        }
    }
}

/**
 * Base class for IF-* processors. provide some helper function.
 */
class SafirIfBaseProcessor extends SafirConditionalProcessor {

    static _tag_attribute_name = 'test';

    getHtmlCondition(node, name) {
        let attr = node.html_attributes.get(name);
        return node.get(attr);
    }

    getTmplCondition(node, name) {
        let attr = node.tmpl_attributes.get(name);
        return node.get(attr);
    }
}

/**
 * IF tag processor
 * @example
 * <sf:if test="show"> ... text ... </sf:if>
 * The text will be displayed if *show* is evaluated to true
 */
class SafirIfTagProcessor extends SafirIfBaseProcessor {
    static _name = 'if';

    process(node, target, parent_processor) {
        let cond = this.getHtmlCondition(node, SafirIfBaseProcessor._tag_attribute_name);
        this.process_if(node, target, parent_processor, cond, true);
    }
}

/**
 * IF-NOT tag processor
 * @example
 * <sf:if-not test="show"> ... text ... </sf:if-not>
 * The text will be displayed if *show* is evaluated to false
 */
class SafirIfNotTagProcessor extends SafirIfBaseProcessor {
    static _name = 'if-not';

    process(node, target, parent_processor) {
        let cond = this.getHtmlCondition(node, SafirIfBaseProcessor._tag_attribute_name);
        this.process_if(node, target, parent_processor, cond, false);
    }
}

// @TODO create an sf:else processor

/**
 * IF attribute processor
 * @example
 * <p sf:if="show"> ... text ... </p>
 * The element <p> and it's children will be displayed if *show* is evaluated to true
 */
class SafirIfAttributeProcessor extends SafirIfBaseProcessor {
    static _name = 'if';

    process(node, target, parent_processor) {
        let cond = this.getTmplCondition(node, SafirIfAttributeProcessor._name);
        node.tmpl_attributes.delete(SafirIfAttributeProcessor._name);
        this.process_if(node, target, parent_processor, cond, true);
    }
}

/**
 * IF-NOT attribute processor
 * @example
 * <p sf:if-not="show"> ... text ... </p>
 * The element <p> and it's children will be displayed if *show* is evaluated to false
 */
class SafirIfNotAttributeProcessor extends SafirIfBaseProcessor {
    static _name = 'if-not';

    process(node, target, parent_processor) {
        let cond = this.getTmplCondition(node, SafirIfNotAttributeProcessor._name);
        node.tmpl_attributes.delete(SafirIfNotAttributeProcessor._name);
        this.process_if(node, target, parent_processor, cond, false);
    }
}
class SafirLoopBaseProcessor {

    getCurrentItem(data, index, variable) {
        let _data = {};
        _data['_index_'] = index;
        _data[variable] = data[index];
        return _data;
    }
}

class SafirLoopAttributeProcessor extends SafirLoopBaseProcessor {

    static _name = 'loop';

    process(node, target, parent_processor) {
        let attr = node.tmpl_attributes.get('loop');
        let data = node.get(attr);
        let variable = node.tmpl_attributes.get('as');

        // node.tmpl_attributes.clear();

        node.tmpl_attributes.delete('loop');
        node.tmpl_attributes.delete('as');
        for (let index in data) {
            let _data = this.getCurrentItem(data, index, variable);
            node.clone().render(target, _data);
        }
    }
}

class SafirLoopTagProcessor extends SafirLoopBaseProcessor {

    static _name = 'loop';

    process(node, target, parent_processor) {
        let attr = node.html_attributes.get('on');
        let data = node.get(attr);
        let variable = node.html_attributes.get('as');

        // node.tmpl_attributes.clear();

        for (let index in data) {
            let _data = this.getCurrentItem(data, index, variable);
            for (let j = 0; j < node.children.length; j++) {
                let child = node.children[j];
                child.clone().render(target, _data);
            }
        }
    }
}
class SafirTextProcessor extends SafirBaseProcessor {
    stringToNode(content) {
        let tpl = document.createElement('template');
        tpl.innerHTML = content;
        return tpl.content;
    }

    escapeHtmlString(text) {
        let escape = document.createElement('textarea');
        escape.textContent = text;
        return escape.innerHTML;
    }
}

class SafirTextElementProcessor extends SafirTextProcessor {
    process(node, target, parent_processor) {
        let components = node.content.split(/\r?\n/);
        for(let i = 0; i < components.length; i++) {
            let text = components[i];
            let child = document.createTextNode(this.evalString(text, node));
            target.appendChild(child);
            if(i < components.length - 1) {
                let child = document.createElement('br');
                target.appendChild(child);
            }
        }
    }
}

class SafirTextAttributeProcessor extends SafirTextProcessor {

    static _name = 'text';

    process(node, target, parent_processor) {
        let attr = node.tmpl_attributes.get('text');
        if (attr !== undefined) {
            let content = node.get(attr);
            node.tmpl_attributes.delete('text');
            if (content !== undefined) {
                let child = new SafirTemplateNode(node);
                child.type = Node.TEXT_NODE;
                child.content = content;
                node.addChild(child);
                parent_processor.process(node, target);
            }
        }
    }
}

class SafirTextEscapedAttributeProcessor extends SafirTextProcessor {

    static _name = 'text-escaped';

    process(node, target, parent_processor) {
        let attr = node.tmpl_attributes.get('text-escaped');
        if (attr !== undefined) {
            let content = node.get(attr);
            node.tmpl_attributes.delete('text-escaped');
            if (content !== undefined) {
                content = this.escapeHtmlString(content);
                let child = new SafirTemplateNode(node);
                child.content = content;
                child.type = Node.TEXT_NODE;
                node.addChild(child);
                parent_processor.process(node, target);
            }
        }
    }
}
/**
 * Generate unique ID
 * @returns {string}
 * @constructor
 */

function SafirIdGenerator() {
    if (typeof SafirIdGenerator.counter == 'undefined') {
        SafirIdGenerator.counter = 0;
    }
    let number = SafirIdGenerator.counter++;
    let prefix = Math.random().toString(36).slice(-5);
    number = number.toString(36).padStart(5, '0');
    return SafirTemplate.prefix + '_' + prefix + number;
}

/**
 * Base class for all Safir objects
 * @class SafirObject
 * @author liva Ramarolahy
 */
class SafirObject {

    prototypes = undefined;

    /**
     * @constructor
     */
    constructor() {
        this.id = SafirIdGenerator();
    }

    listPrototypes(prefix) {
        if (this.prototypes === undefined) {
            this.prototypes = this._getPrototypes(Object.getPrototypeOf(this));
        }
        return this.prototypes.filter(function (p) {
            return p.startsWith(prefix);
        });
    }

    hasPrototype(name) {
        return this[name] !== undefined;
    }

    _getPrototypes(prototype) {

        let prototypes = Object.getOwnPropertyNames(prototype).filter(function (p) {
            return typeof prototype[p] === 'function'
        });

        let constructor = Object.getPrototypeOf(prototype.constructor);
        if (constructor.name !== 'SafirObject') {
            if (constructor.prototype) {
                let tmp = this._getPrototypes(constructor.prototype);
                prototypes = prototypes.concat(tmp);
            }
        }
        return prototypes;
    }

}

let safir = {};

safir.core = {
    load: function (func, objects) {
        SafirRegistry.initializers.push(func);
        if (Array.isArray(objects)) {
            for (let i in objects) {
                SafirRegistry.add(objects[i]);
            }
        }
    },

    init: function (parent) {

        let elements = parent.querySelectorAll(':not(form)[' + SafirTemplate.prefix + '\\:listener]');

        elements.forEach(function (elt) {
            if (elt.tagName !== 'TEMPLATE') {
                let attr_name = SafirTemplate.prefix + ':listener';
                let attr = elt.getAttribute(attr_name);
                let listener = SafirRegistry.get(attr);
                if (listener !== null) {
                    let target = new SafirEventTarget(elt);
                    target.addEventListener(listener);
                    elt.removeAttribute(attr_name);

                } else {
                    console.error('%cListener [' + attr + '] not found. %cPlease add: %cSafirRegistry.add(' + attr + '); %cin your code'
                        , 'color:red;', 'color:black;', 'color:blue; font-weight:bold;', 'color:black;');
                }
            }
        });

        let forms = parent.querySelectorAll('form');

        forms.forEach(function (elt) {

            let form = null;
            /**
             * Check if custom form class was provided
             * @type {Attr}
             */
            let is_attr = elt.attributes.getNamedItem(SafirTemplate.prefix + ':is');
            if (is_attr) {
                let _class = SafirRegistry.get(is_attr.value);
                if (_class !== null) {
                    form = Reflect.construct(_class, [elt]);
                }
            }
            if (form === null) {
                form = new SafirSecureForm(elt);
            }

            let attr = elt.attributes.getNamedItem(SafirTemplate.prefix + ':response-handler');
            if (attr) {
                let handlers = attr.value.split(',');
                for (let i = 0; i < handlers.length; i++) {
                    let handler = SafirRegistry.get(handlers[i]);
                    if (handler !== null) {
                        form.request.registerResponseHandler(handler, elt);
                    } else {
                        console.error('Handler not found', handlers[i]);
                    }
                }
            }

            if (form !== null) {
                // Finally add some default handler
                form.request.registerResponseHandler(SafirRedirectHandler, form);
            }
        });

        // Init forms
        // @TODO Third-party initialization should be moved out of this script.

        let editable = parent.querySelectorAll('.form-editable');
        editable.forEach(function (element, index) {
            Reflect.construct(BootstrapEditableFormHelper, [element]);
        });
    },

    register: function () {
        for (let i = 0; i < arguments.length; i++) {
            let arg = arguments[i];
            if (arg instanceof SafirHttpHandler) {
                console.log(arg);
            } else if (arg instanceof SafirEventListener) {
                console.log(arg);
            }
        }
    }
};
/**
 * Handle element than can listen events
 * @class SafirEventTarget
 * @author liva Ramarolahy
 */

class SafirEventListener extends SafirObject {
    /**
     *
     * @param selector
     */
    apply(selector) {
        let element = null;
        if (selector instanceof Element) {
            element = selector;
        } else {
            element = document.querySelector(selector);
        }
        if (element instanceof Element) {
            const listener = this;
            let prototypes = this.listPrototypes('on_');
            prototypes.forEach(function (p, index) {
                let name = p.substr(3);
                element.addEventListener(name, function(event){
                    listener[p].call(listener, event, element);
                });
            }, this);
        } else {
            console.error('SafirEventListener', 'Element with selector [' + selector + '] not found');
        }
    }
}
class SafirOption {

    static registry = {};

    constructor(options) {
        this.values = options || {};
    }

    getOptions() {
        return this.values;
    }

    merge(options) {
        if (options !== undefined) {
            for (let name in options) {
                let value = options[name];
                if (!this.values.hasOwnProperty(name)) {
                    this.values[name] = value;
                } else {
                    this.mergeWith(this.values[name], value);
                }
            }
        }
    }

    mergeWith(dest, options) {
        if (Array.isArray(dest)) { // merge array
            if (Array.isArray(options)) {
                dest = dest.concat(options);
            } else {
                dest.push(options);
            }
        } else if (typeof dest === 'object' && dest !== null) { // merge object
            for (let name in options) {
                let value = options[name];
                if (!dest.hasOwnProperty(name)) {
                    dest[name] = value;
                } else {
                    this.mergeWith(dest[name], value);
                }
            }
        } else { // merge scalar
            dest = options;
        }
    }

    get(name) {
        return this.values.hasOwnProperty(name) ? this.values[name] : undefined;
    }

    set(name, value) {
        this.values[name] = value;
    }

    static unload(selector) {
        return SafirOption.registry.hasOwnProperty(selector) ? SafirOption.registry[selector] : undefined;
    }

    static load(selector, options) {
        SafirOption.registry[selector] = options;
    }
}
class SafirRequestStateListener {

    constructor(request) {
        this.request = request;
        this.xhr = request.xhr;
    }

    onChange(state) {

        switch (state) {
            case XMLHttpRequest.OPENED:
                // request headers can be updated here
                for (const header in this.request.headers) {
                    this.xhr.setRequestHeader(header, this.request.headers[header]);
                }
                break;
            case XMLHttpRequest.HEADERS_RECEIVED:
                if (this.request.response_handlers.length > 0) {
                    for (let i in this.request.response_handlers) {
                        let handler = this.request.response_handlers[i];
                        if (handler.on_http_sent) {
                            handler.on_http_sent.call(handler);
                        }
                    }
                }
                break;
            case XMLHttpRequest.LOADING:
                break;
            case XMLHttpRequest.DONE:

                if (this.request.response_handlers.length > 0) {

                    let response_json = null;
                    for (let i in this.request.response_handlers) {
                        let handler = this.request.response_handlers[i];
                        if (handler) {

                            try {
                                response_json = JSON.parse(this.xhr.responseText);
                            } catch (error) {
                                console.log(error);
                            }

                            if (this.xhr.status >= 200 && this.xhr.status < 400) {
                                if (handler.on_http_success) {
                                    handler.on_http_success.call(handler, this.xhr.status, response_json, this.xhr.responseText);
                                }

                            } else if (this.xhr.status >= 400) {
                                if (handler.on_http_error) {
                                    handler.on_http_error.call(handler, this.xhr.status, response_json, this.xhr.responseText);
                                }
                            }
                        }
                    }
                }
                break;
        }
    }
}

class SafirUploadRequestListener {
    constructor(request) {
        this.request = request;
        this.xhr = request.xhr;
        this.xhr.upload.onprogress = this.onProgress.bind(this);
        this.xhr.upload.onabort = this.onAbort.bind(this);
        this.xhr.upload.onerror = this.onError.bind(this);
        this.xhr.upload.ontimeout = this.onTimeout.bind(this);
    }

    onProgress(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler) {
                if(handler.on_upload_progress) {
                    handler.on_upload_progress.call(handler, event);
                } else if(handler.on_progress) {
                    handler.on_progress.call(handler, event);
                }
            }
        }
    }

    onAbort(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_abort) {
                handler.on_abort.call(handler, event);
            }
        }
    }

    onError(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_http_error) {
                handler.on_http_error.call(handler, event);
            }
        }
    }

    onTimeout(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_timeout) {
                handler.on_timeout.call(handler, event);
            }
        }
    }
}
class SafirDownloadRequestListener {
    constructor(request) {
        this.request = request;
        this.xhr = request.xhr;
        this.xhr.onprogress = this.onProgress.bind(this);
        this.xhr.onabort = this.onAbort.bind(this);
        this.xhr.onerror = this.onError.bind(this);
        this.xhr.ontimeout = this.onTimeout.bind(this);
    }

    onProgress(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler) {
                if(handler.on_download_progress) {
                    handler.on_download_progress.call(handler, event);
                } else if(handler.on_progress) {
                    handler.on_progress.call(handler, event);
                }
            }
        }
    }

    onAbort(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_abort) {
                handler.on_abort.call(handler, event);
            }
        }
    }

    onError(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_http_error) {
                handler.on_http_error.call(handler, event);
            }
        }
    }

    onTimeout(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_timeout) {
                handler.on_timeout.call(handler, event);
            }
        }
    }
}
class SafirHttpRequest extends SafirObject {

    method = 'post';
    url = '';
    response_handlers = [];
    headers = {};

    /**
     *
     */
    constructor(options) {
        super();
        this.options = new SafirOption(options);
        options = this.options.getOptions();

        this.xhr = new XMLHttpRequest();
        this.xhr.withCredentials = true;
        this.xhr.onreadystatechange = this.onStateChanged.bind(this);
        this.xhr.onerror = this.onError.bind(this);

        this.state_listener = new SafirRequestStateListener(this);
        this.upload_listener = new SafirUploadRequestListener(this);
        this.download_listener = new SafirDownloadRequestListener(this);

        if (options.hasOwnProperty('response_handlers')) {
            for (const i in options.response_handlers) {
                let handler = options.response_handlers[i];
                this.registerResponseHandler(handler);
            }
        }
    }

    onStateChanged(){
        this.state_listener.onChange(this.xhr.readyState);
    }

    onError() {
        for (let i in this.response_handlers) {
            let handler = this.response_handlers[i];
            if (handler && handler.on_network_error) {
                handler.on_network_error.call(handler, data);
            }
        }
    }

    registerResponseHandler(handler, selector) {
        try {
            this.response_handlers.push(Reflect.construct(handler, [selector]));
        } catch (e) {
            this.response_handlers.push(handler);
        }
    }

    /**
     *
     */
    prepare(method, url, headers) {
        this.method = method;
        this.url = url;
        // Prepare custom headers
        if (headers) {
            for (const header in headers) {
                this.headers[header] = headers[header];
            }
        }
    }

    /**
     *
     */
    send(data) {

        let url = this.url;
        let method = this.method.toUpperCase();

        if(this.xhr.readyState !== XMLHttpRequest.OPENED) {
            if(method === 'GET' && data !== undefined) {
                let queryString = this.toQueryString(data);
                if(queryString) {
                    url = url + '?' + queryString;
                }
            }
            this.xhr.open(this.method, url, true);
        }

        if(method === 'GET') {
            this.xhr.send();
        } else {
            if(data instanceof SafirRequestData) {
                data = data.toFormData();
            }
            this.xhr.send(data);
        }
    }

    toQueryString(data) {
        if (data instanceof SafirRequestData) {
            return data.toQueryString();
        } else if (data instanceof FormData) {
            let request_data = new SafirRequestData();
            for (let key of data.keys()) {
                request_data.append(key, data.get(key));
            }
            return request_data.toQueryString();
        } else {
            let request_data = new SafirRequestData();
            for (let key in data) {
                request_data.append(key, data[key]);
            }
            return request_data.toQueryString();
        }
    }
}

class SafirSecureHttpRequest extends SafirHttpRequest {
    constructor(options) {
        super(options);
        this.headers['Accept'] = 'application/json';
        let token_name = document.querySelector('meta[name="secure-token-name"]');
        let token_value = document.querySelector('meta[name="secure-token"]');

        if (token_value) {
            let value = token_value.getAttribute('content');
            if (token_name) {
                let name = token_name.getAttribute('content');
                this.headers[name] = value;
            } else {
                this.headers['X-CSRF-TOKEN'] = value;
            }
        } else {
            console.warn('[secure-token] META not found in page header');
        }
    }
}

class SafirRequestData {

    data = {};
    attachments = {};

    constructor() {
    }

    append(name, value) {
        if (value instanceof File) {
            this._append(name, value, this.attachments);
        } else {
            this._append(name, value, this.data);
        }
    }

    _append(name, value, destination) {
        if (!destination.hasOwnProperty(name)) {
            destination[name] = value;
        } else {
            if (Array.isArray(destination[name])) {
                destination[name].push(value);
            } else {
                destination[name] = [destination[name], value];
            }
        }
    }

    set(name, value) {
        if (value instanceof File) {
            this.attachments[name] = value;
        } else {
            this.data[name] = value;
        }
    }

    toQueryString() {
        if (Object.keys(this.data).length > 0) {
            let components = [];
            for (let p in this.data) {
                if (this.data.hasOwnProperty(p)) {
                    components.push(this._fixURIComponent(p) + '=' + this._fixURIComponent(this.data[p]));
                }
            }
            return components.join("&");
        } else {
            return null;
        }
    }

    toFormData() {
        let form_data = new FormData();

        if (Object.keys(this.data).length > 0) {
            form_data.set('data', JSON.stringify(this.data));
        } else {
            form_data.set('data', null);
        }

        if (Object.keys(this.attachments).length > 0) {
            for (let p in this.attachments) {
                let attachment = this.attachments[p];
                if (Array.isArray(attachment)) {
                    for (let i = 0; i < attachment.length; i++) {
                        form_data.append(p, attachment[i]);
                    }
                } else {
                    form_data.set(p, attachment);
                }
            }
        }

        return form_data;
    }

    _fixURIComponent(str) {
        return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
            return '%' + c.charCodeAt(0).toString(16);
        });
    };
}


/**
 * Handle element than can be targeted by events
 * @class SafirEventTarget
 * @author liva Ramarolahy
 */

class SafirEventTarget extends SafirObject {

    /**
     *
     * @type {Map<string, SafirEventTarget>}
     */
    static registry = new Map();

    constructor(selector) {
        super();

        this.event_listeners = new Map();

        if (selector instanceof Element) {
            this.elt = selector;
        } else {
            this.elt = document.querySelector(selector);
        }

        if (this.elt instanceof Element) {
            this.setupId();
            if (SafirEventTarget.registry.has(this.elt.id)) {
                return SafirEventTarget.registry.get(this.elt.id);
            } else {
                SafirEventTarget.registry.set(this.elt.id, this);
            }
        } else {
            console.warn('SafirEventTarget', 'Element with selector [' + selector + '] not found');
        }
    }

    /**
     * Generate a new ID if missing
     */
    setupId() {
        if (this.elt.hasAttribute('id')) {
            let elt_id = this.elt.getAttribute('id');
            if (elt_id.trim() !== '') {
                this.id = elt_id;
            } else {
                this.elt.setAttribute('id', this.id);
            }
        } else {
            this.elt.setAttribute('id', this.id);
        }
    }

    /**
     * Add an event listener to the current target. This method ensure that each type of listener is added only once
     * by maintaining the list of listeners in the instance.
     * @param listener
     */
    addEventListener(listener) {
        try {
            listener = Reflect.construct(listener, [this.elt]);
        } catch (e) {
            console.error(e);
        }

        if (listener instanceof SafirEventListener) {
            let constructor = listener.constructor.name;
            if (!this.event_listeners.has(constructor)) {
                listener.target = this;
                listener.apply(this.elt);
                this.event_listeners.set(constructor, listener);
            }
        } else {
            console.error(listener.constructor.name + ' IS NOT an instance of SafirEventListener');
            console.log(listener);
        }
    }
}

/**
 * Handle basic element
 * @class SafirElement
 * @author liva Ramarolahy
 */
class SafirElement extends SafirEventTarget {
    constructor(selector) {
        super(selector);
        if(this.elt) {
            this.elt.setAttributeNS(SafirTemplate.namespace, SafirTemplate.prefix + ':view', true);
        }
    }
}

// class SafirElementBuilder {
//
//     /**
//      *
//      * @param selector
//      * @param options
//      */
//     static setup(selector, options) {
//         let elements = document.querySelectorAll(selector);
//         elements.forEach(function (element, index) {
//             if (!element.hasAttributeNS(SafirTemplate.namespace, 'view')) {
//                 Reflect.construct(SafirElement, [element, options]);
//             }
//         });
//     }
// }

class SafirForm extends SafirElement {

    constructor(selector, request) {
        super(selector);
        if (request !== undefined) {
            this.request = Reflect.construct(request, []);
        } else {
            this.request = new SafirHttpRequest();
        }

        this.request.prepare(this.elt.method || 'post', this.elt.action);
        this.addEventListener(SafirFormListener);

        // let listener_attr = this.elt.attributes.getNamedItem(SafirTemplate.prefix + ':listener');
        // if(!listener_attr) {
        //
        // } else {
        //     let attr_name = SafirTemplate.prefix + ':listener';
        //     let attr = this.elt.getAttribute(attr_name);
        //     console.log('attr', attr);
        //     let listener = SafirRegistry.get(attr);
        //     this.addEventListener(listener);
        // }
        // console.log(this);
    }

    submit() {
        let data = new FormData(this.elt);
        this.request.send(data);
    }
}

class SafirSecureForm extends SafirForm {
    constructor(selector) {
        super(selector, SafirSecureHttpRequest);
    }
}

class SafirFormListener extends SafirEventListener {
    on_submit(event, target) {
        event.preventDefault();
        this.target.submit();
    }
}

/**
 * Simple redirect handler
 */
class SafirRedirectHandler {
    on_http_success(status, json) {
        if (json.next) {
            window.location.href = json.next;
        }
    }
}
class BootstrapEditableFormHelper {
    constructor(selector) {
        if (selector instanceof Element) {
            this.elt = selector;
        } else {
            this.elt = document.querySelector(selector);
        }
        this.addToggleListener();
        this.addEditableListener();
    }

    addEditableListener() {
        let elements = this.elt.querySelectorAll('.form-control-editable');
        if (elements.length > 0) {
            let form = this;
            elements.forEach(function (element, index) {
                element.addEventListener('click', form.showEditable.bind(form));
            });
        }
    }

    addToggleListener() {
        let trigger = this.elt.querySelector('.form-editable-toggle');
        trigger.addEventListener('click', this.onToggleClick.bind(this));
    }

    onToggleClick() {
        this.showEditable();
    }

    showEditable() {
        let elements = this.elt.querySelectorAll('.form-control-editable');
        this.showEditableFormControls(elements);

        let editable = this.elt.querySelectorAll('.form-edit-only');
        if (editable.length > 0) {
            editable.forEach(function (element, index) {
                element.classList.remove('form-edit-only');
            });
        }

        let display = this.elt.querySelectorAll('.form-display-only');
        if (display.length > 0) {
            display.forEach(function (element, index) {
                element.classList.add('d-none');
            });
        }
    }

    showEditableFormControls(elements) {
        if (elements.length > 0) {
            elements.forEach(function (element, index) {
                element.classList.remove('form-control-plaintext');
                element.classList.add('form-control');
                element.readOnly = false;
            });
        }
    }
}


/**
 * Define some utility functions to manipulate DOM
 */
class SafirElementCollection extends SafirObject {
    constructor(selector) {
        super();
        this.elements = document.querySelectorAll(selector);
    }
}

safir.dom = {

    style(selector, name, value) {
        if (selector instanceof Element) {
            if (selector.style.hasOwnProperty(name)) {
                selector.style[name] = value;
            }
        } else {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element.style.hasOwnProperty(name)) {
                    element.style[name] = value;
                }
            });
        }
    },

    hide : function(selector){
        safir.dom.style(selector,'display', 'none');
    },

    show : function(selector, display){
        if(display === undefined) {
            display = 'block';
        }
        safir.dom.style(selector,'display', display);
    },

    collectDataset : function(selector, name) {
        let values = [];
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if(element.dataset.hasOwnProperty(name)) {
                values.push(element.dataset[name]);
            }
        });
        return values;
    },

    /**
     *
     * @param value
     */
    addClass(selector, value) {
        if (selector instanceof Element) {
            selector.classList.add(value);
        } else {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.classList.add(value);
            });
        }

    },

    /**
     *
     * @param value
     */
    removeClass(selector, value) {
        if (selector instanceof Element) {
            selector.classList.remove(value);
        } else {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.classList.remove(value);
            });
        }
    }
};
class SafirFormHandler {
    constructor(selector) {
        if (selector instanceof Element) {
            this.elt = selector;
        } else {
            this.elt = document.querySelector(selector);
        }
    }

    getFieldByName(name) {
        return this.elt.querySelector('*[name="' + name + '"]');
    }

    /**
     *
     * @param errors
     */
    showFormGroupErrors(errors) {
        let fields = this.elt.querySelectorAll('.form-control');

        fields.forEach(function(field){
            field.classList.remove('is-valid');
            field.classList.remove('is-invalid');
        });

        let feedback_containers = this.elt.querySelectorAll('.invalid-feedback');

        feedback_containers.forEach(function(container){
            container.classList.add('d-none');
        });

        for (let field in errors) {
            // Find field
            let current_field = this.getFieldByName(field);
            this.showFieldErrors(current_field, errors);
        }
    }

    showFieldErrors(field, errors) {

        //find parent group
        let feedback_container = this.getFeedbackContainer(field);
        if(!feedback_container) {
            feedback_container = document.createElement('div');
            feedback_container.classList.add('invalid-feedback');
            let parent = field.parentNode;
            parent.append(feedback_container);
        } else {
            feedback_container.classList.remove('d-none');
        }

        console.log(feedback_container);

        field.classList.add('is-invalid');
        feedback_container.innerHTML = errors[field.name].join(', ');
    }

    getFeedbackContainer(field) {
        let parent = field.parentNode;
        let children = parent.childNodes;

        let feedback_container = undefined;

        for (let i=0; i < children.length; i++) {
            console.log(children[i]);
            let elt = children[i];
            if (elt.classList && elt.classList.contains('invalid-feedback')) {
                feedback_container = children[i];
                break;
            }
        }

        if(feedback_container === undefined) {

        }

        return feedback_container;
    }
}
class SafirFileUploader {
    constructor(options) {

        this.target = document.getElementById(options.target);
        this.preview = document.getElementById(options.preview);
        this.template = document.getElementById(options.template);
        this.max_size = options.max_size || (512 * 1024);
        this.max_count = options.max_count || 10;
        this.addTargetEventListener();
    }

    addTargetEventListener() {
        if (this.target) {
            this.target.addEventListener('change', this.loadPreview.bind(this));
        }
    }

    loadPreview() {
        let files = this.target.files;

        let template = new SafirTemplate(this.template);

        if (files.length > 0) {
            for (let i = 0; i < files.length && i < this.max_count; i++) {
                const file = files[i];
                if (!file.type.startsWith('image/')){
                    continue;
                }

                let data = {index: i};
                if (file.size > this.max_size) {
                    data.valid_size = false;
                } else {
                    data.valid_size = true;
                }

                const reader = new FileReader();
                reader.onload = (function (_template, _preview, _data) {
                    return function (e) {
                        _data.file_data = e.target.result;
                        _template.render(_preview, _data);

                    };
                })(template, this.preview, data);

                reader.readAsDataURL(file);
            }
        }
    }
}
/**
 *
 */
class SafirUIAutocomplete extends SafirObject {
    constructor(options) {
        super();
        this.target = options.target;
        this.template = options.template;
        this.url = options.url;
        this.request = options.request ? Reflect.construct(options.request, [])
            : Reflect.construct(SafirHttpRequest, []);
        this.request.registerResponseHandler(this);
        this.request.prepare('get', this.url);
        this.data_queue = [];
        this.request_pending = false;
        this.initSuggestionContainer();
        this.target.setAttribute('autocomplete', 'off');
    }

    /**
     *
     * @param data
     */
    query(data) {
        this.data_queue.push(data);
        if (this.request_pending === false) {
            this._send_query();
        }
    }

    /**
     * @TODO move container class ['autocomplete-items'] to options
     */
    initSuggestionContainer() {
        let tmp_container = this.target.nextElementSibling;
        if (!tmp_container.classList.contains('autocomplete-items')) {
            // Bad container, should create a new one
            let good_container = document.createElement('div');
            good_container.classList.add('autocomplete-items');
            this.container = good_container;
            this.target.parentElement.insertBefore(this.container, tmp_container);
        } else {
            this.container = tmp_container;
        }
    }

    _send_query() {
        let data = this.data_queue[0];
        this.request.send(data);
    }

    on_http_sent() {
        this.request_pending = true;
        this.data_queue.shift();
    }

    on_http_success(status, json, response) {
        this.clearSuggestions();
        let template = new SafirTemplate(this.template);
        template.render(this.container, json);
        this.request_pending = false;

        this.addItemEventListeners(json.terms);

        // Get last data
        let data = this.data_queue.pop();
        if (data !== undefined) {
            this.data_queue = [data];
            this._send_query();
        }
    }

    on_http_error(status, json, response) {

    }

    addItemEventListeners(terms) {
        let items = this.container.querySelectorAll('.item');
        for (let i = 0; i < items.length; ++i) {
            let item = items[i];
            let term = terms[i];
            let event = new Event('select');
            event.data = term;
            item.addEventListener('click', () => {
                item.dispatchEvent(event);
            });
            item.addEventListener('select', this.onItemSelect.bind(this));
        }
    }

    clearSuggestions() {
        // Remove previous terms
        while (this.container.firstChild) {
            this.container.removeChild(this.container.lastChild);
        }
    }

    onItemSelect(event) {
        this.target.value = event.data.value;
        this.clearSuggestions();
    }

    on_network_error(data) {

    }
}

class SafirDropdown extends SafirEventTarget{
    constructor(selector) {
        super(selector);
    }

    listen() {
        this.elt.addEventListener('click', this.toggleDropdown.bind(this));
        document.addEventListener('click', this.hideDropdown.bind(this));
    }

    toggleDropdown(event){

        event.preventDefault();

        // Hide all

        let dropdowns = document.querySelectorAll('.dropdown-menu');

        dropdowns.forEach(function(dropdown){
            dropdown.style.display = 'none';
        });

        // handle current target

        let currentTarget;

        for(let i in event.path) {
            if(event.path[i].matches('.dropdown-toggle')) {
                currentTarget = event.path[i];
                break;
            }
        }

        let sibling = currentTarget.nextElementSibling;
        while (sibling) {
            if (sibling.matches('.dropdown-menu')) {
                if(sibling.style.display === 'block') {
                    sibling.style.display = 'none';
                } else {
                    sibling.style.display = 'block';
                }
                return;
            }
            sibling = sibling.nextElementSibling;
        }
    }

    hideDropdown(event){
        // let dropdown = document.querySelectorAll('.dropdown-menu');

        for(let i in event.path) {
            if(event.path[i].matches && event.path[i].matches('.dropdown-toggle')) {
                return;
            }
        }

        let dropdowns = document.querySelectorAll('.dropdown-menu');

        dropdowns.forEach(function(dropdown){
            dropdown.style.display = 'none';
        });
    }
}

window.addEventListener('DOMContentLoaded', (event) => {
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    dropdowns.forEach(function(element){
        let dropdown = new SafirDropdown(element);
        dropdown.listen();
    });
});

class SafirModal {
    constructor(selector) {
        this.element = document.querySelector(selector);
        this.closers = this.element.querySelectorAll('.close');
        if(this.closers !== undefined && this.closers.length > 0) {
            for(let i = 0; i < this.closers.length; i++) {
                this.closers[i].addEventListener('click', this.close.bind(this));
            }
        }
        window.addEventListener('click', this.backgroundEventListener.bind(this));
    }

    open() {
        this.element.style.display = "block";
    }

    close() {
        this.element.style.display = "none";
    }
    backgroundEventListener(event) {
        if(event.target == this.element) {
            this.close();
        }
    }
}
class SafirProgressBar extends SafirElement {

    constructor(selector) {
        super(selector);
    }

    on_progress(event) {
        if(this.elt) {
            let percent_completed = (event.loaded / event.total) * 100;
            this.elt.style.width = percent_completed + '%';
            console.log('percent_completed', percent_completed);
        }
    }
}
// Init library prefix
let element = document.querySelector('html');

for (let name of element.getAttributeNames()) {
    let value = element.getAttribute(name);
    if (value === SafirTemplate.namespace) {
        const names = name.split(':');
        if (names.length > 1 && names[0] === 'xmlns') {
            SafirTemplate.prefix = names[1];
        }
    }
}

if (SafirTemplate.prefix === '') {
    console.warn('Template namespace not specified, using default: sf');
    SafirTemplate.prefix = 'sf';
}

// Create helper function

/**
 * @TODO find a way to remove this class
 */
class SafirRegistry {

    static registry = new Map();

    static initializers = new Array();

    static listeners = new Map();

    static add() {
        for (let i = 0; i < arguments.length; i++) {
            let arg = arguments[i];
            if (arg.hasOwnProperty('name')) {
                SafirRegistry.registry.set(arg.name, arg);
            } else {
                console.log('no name', arg);
            }
        }
    }

    static get(name) {
        if (SafirRegistry.registry.has(name)) {
            return SafirRegistry.registry.get(name);
        } else {
            return null;
        }
    }
}

window.addEventListener('DOMContentLoaded', (event) => {

    /**
     * Attribute processors
     */
    SafirTemplateProcessor.registerAttr(
        SafirTextAttributeProcessor // text
        , SafirTextEscapedAttributeProcessor // text-escaped
        , SafirIfAttributeProcessor // if
        , SafirIfNotAttributeProcessor // if-not
        , SafirLoopAttributeProcessor // loop
        , SafirDataAttributeProcessor // attach-data
    );

    /**
     * Tag Processors
     */
    SafirTemplateProcessor.registerTag(
        SafirIfTagProcessor // if
        , SafirIfNotTagProcessor // if-not
        , SafirLoopTagProcessor // loop
    );

    for (let i in SafirRegistry.initializers) {
        SafirRegistry.initializers[i].call();
    }

    // Init all listeners
    safir.core.init(document);

});