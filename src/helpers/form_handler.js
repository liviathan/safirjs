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
        let groups = this.elt.querySelectorAll('.form-group');

        groups.forEach(function(group){
            group.classList.remove('has-error');
        });

        let error_containers = this.elt.querySelectorAll('.error-container');

        error_containers.forEach(function(container){
            container.classList.add('hidden');
        });

        for (let field in errors) {
            // Find field
            let current_field = this.getFieldByName(field);
            this.showFieldErrors(current_field, errors);
        }
    }

    showFieldErrors(field, errors) {
        //find parent group
        let parent = field.closest('.form-group', this.elt);
        if (parent) {

            let container = parent.querySelector('.error-container');
            if(!container) {
                container = document.createElement('p');
                container.classList.add('error-container');
                container.classList.remove('hidden');
                parent.append(container);
            } else {
                container.classList.remove('hidden');
            }

            parent.classList.add('has-error');
            container.innerHTML = errors[field.name].join(', ');
        }
    }
}