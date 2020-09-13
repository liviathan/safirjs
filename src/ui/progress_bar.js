class SafirProgressBar extends SafirElement {

    constructor(selector) {
        super(selector);
    }

    on_progress(event) {
        if(this.elt) {
            let percent_completed = (event.loaded / event.total) * 100;
            this.elt.style.width = percent_completed + '%';
            console.log('percent_completed', percent_completed);
        }
    }
}