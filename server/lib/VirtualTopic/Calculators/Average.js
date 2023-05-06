import Calculator from './Calculator.js';

export default class Average extends Calculator {
    constructor(parent, options) {
        super(parent, options);

        this.name = 'average';
        this.label = 'VIRTUAL TOPIC CALCULATOR AVERAGE';
        this.debug ? LOG(this.label, 'INIT WITH TOPIC:', this.topic) : null;
    }

    // custom calculate function
    calculate() {
        let value = 0, count = 0;

        Object.keys(this.values).forEach(topic => {
            value += parseFloat(this.values[topic]) || 0;
            count++;
        });

        if (count === 0)
            return;

        this.value = value / count;

        /*this.source.forEach(topic => {
            if (Object.keys(this.sourceData).includes(topic)) {
                this.temperatures[topic] = parseFloat(this.sourceData[topic]);
                value += this.temperatures[topic] || 0;
                count++;
            }
        });

        if (count === this.source.length) {
            this.value = value / count;
        } else {
            LOG(this.label, this.parent.label, 'MISSING', (this.source.length - count), 'SOURCE(S)');
        }

         */
    }
}