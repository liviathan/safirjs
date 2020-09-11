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