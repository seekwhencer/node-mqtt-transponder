import Calculator from './Calculator.js';

export default class DewPoint extends Calculator {
    constructor(parent, options) {
        super(parent, options);

        this.name = 'dewpoint';
        this.label = 'VIRTUAL TOPIC CALCULATOR DEWPOINT';
        this.debug ? LOG(this.label, 'INIT WITH TOPIC:', this.topic) : null;
    }

    // custom calculate function
    calculate() {
        this.humidity = false;
        this.temperature = false;

        const fields = Object.keys(this.source);
        fields.forEach(f => this[f] = this.values[this.source[f]]);

        if (!this.humidity || !this.temperature)
            return;

        this.temperature = parseFloat(this.temperature);
        this.humidity = parseFloat(this.humidity) / 100;    // wants float 0 - 1 range from 0 - 100 %

        this.value = this.pm.GetTDewPointFromRelHum(this.temperature, this.humidity);
    }
}