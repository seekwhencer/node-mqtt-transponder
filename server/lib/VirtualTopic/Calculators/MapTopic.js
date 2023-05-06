import Calculator from './Calculator.js';

export default class MapTopic extends Calculator {
    constructor(parent, options) {
        super(parent, options);

        this.name = 'maptopic';
        this.label = 'VIRTUAL TOPIC CALCULATOR MAP TOPIC';
        this.debug ? LOG(this.label, 'INIT WITH TOPIC:', this.topic) : null;
    }

    calculate() {
        this.contact = 0;
        this.values[this.source] === 'true' ? this.contact = 1 : this.contact = 0;
        this.value = this.contact;
    }
}