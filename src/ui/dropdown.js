
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
