import Calculator from './Calculator.js';

export default class MoistAirVolume extends Calculator {
    constructor(parent, options) {
        super(parent, options);

        this.name = 'moistairvolume';
        this.label = 'TOPIC CALCULATOR AIR VOLUME';
        this.debug ? LOG(this.label, 'INIT WITH TOPIC:', this.topic) : null;
    }

    // custom calculate function
    calculate() {
        super.calculate();

        this.temperature = false;
        this.humidity = false;
        this.pressure = false;

        const fields = Object.keys(this.source);
        fields.forEach(f => this[f] = this.values[this.source[f]]);

        if (!this.humidity || !this.temperature || !this.pressure)
            return;

        // shift values for pm
        this.temperature = parseFloat(this.temperature);
        this.humidity = parseFloat(this.humidity);          // absolute humidity
        this.pressure = parseFloat(this.pressure) * 100;    // wants pascal from kPa

        this.value = this.pm.GetMoistAirVolume(this.temperature, this.humidity, this.pressure);
    }
}