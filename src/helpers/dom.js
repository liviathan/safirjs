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