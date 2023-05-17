import Calculator from './Calculator.js';

export default class MoistAirVolume extends Calculator {
    constructor(parent, options) {
        super(parent, options);

        this.name = 'moistairdensity';
        this.label = 'TOPIC CALCULATOR AIR DENSITY';
        this.debug ? LOG(this.label, 'INIT WITH TOPIC:', this.topic) : null;
    }

    // custom calculate function
    calculate() {
        super.calculate();
        this.humidity = false;

        const fields = Object.keys(this.source);
        fields.forEach(f => this[f] = this.values[this.source[f]]);

        if (!this.humidity)
            return;

        this.value = parseFloat(this.humidity) * 1000;
    }
}