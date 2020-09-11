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