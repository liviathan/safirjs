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