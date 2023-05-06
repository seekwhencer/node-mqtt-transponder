import Calculator from './Calculator.js';

export default class AbsoluteHumidity extends Calculator {
    constructor(parent, options) {
        super(parent, options);

        this.name = 'absolutehumidity';
        this.label = 'VIRTUAL TOPIC CALCULATOR ABSOLUTE HUMIDITY';
        this.debug ? LOG(this.label, 'INIT WITH TOPIC:', this.topic) : null;
    }

    // custom calculation
    calculate() {
        this.temperature = false;
        this.humidity = false;

        const fields = Object.keys(this.source);
        fields.forEach(f => this[f] = this.values[this.source[f]]);

        if (!this.humidity || !this.temperature || !this.pressure)
            return;

        // shift values for pm
        this.temperature = parseFloat(this.temperature);
        this.humidity = parseFloat(this.humidity) / 100;    // wants float 0 - 1 range from 0 - 100 %
        this.pressure = parseFloat(this.pressure) * 100;    // wants pascal from kPa

        this.value = this.pm.GetHumRatioFromRelHum(this.temperature, this.humidity, this.pressure) * 100; // g/m³
    }
}