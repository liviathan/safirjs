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