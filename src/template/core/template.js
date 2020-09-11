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