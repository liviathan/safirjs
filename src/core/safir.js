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

        let elements = parent.querySelectorAll('[' + SafirTemplate.prefix + '\\:listener]');

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
                        form.request.registerResponseHandler(handler);
                    } else {
                        console.error('Handler not found', handlers[i]);
                    }
                }
            }

            if (form !== null) {
                // Finally add some default handler
                form.request.registerResponseHandler(SafirRedirectHandler);
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