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

