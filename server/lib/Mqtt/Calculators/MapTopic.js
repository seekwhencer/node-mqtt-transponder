import Calculator from './Calculator.js';

export default class MapTopic extends Calculator {
    constructor(parent, options) {
        super(parent, options);

        this.name = 'maptopic';
        this.label = 'TOPIC CALCULATOR MAP TOPIC';
        this.debug = true;
        this.debug ? LOG(this.label, 'INIT WITH TOPIC:', this.topic) : null;
    }

    calculate() {
        super.calculate();

        const sourceTopic = this.parent.source.data;
        const value = this.values[sourceTopic];

        if (!value)
            return;

        if (this.transform === 'string-boolean') {
            value === 'true' ? this.value = 1 : null;
            value === 'false' ? this.value = 0 : null;
        }

        if (this.transform === 'string-float') {
            this.value = parseFloat(value);
        }
    }
}