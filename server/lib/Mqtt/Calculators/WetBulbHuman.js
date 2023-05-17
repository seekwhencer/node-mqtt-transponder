import Calculator from './Calculator.js';

export default class WetBulbHuman extends Calculator {
    constructor(parent, options) {
        super(parent, options);

        this.name = 'wetbulbhuman';
        this.label = 'TOPIC CALCULATOR WET BULB HUMAN';
        this.max = this.options.max || 42;
        this.debug ? LOG(this.label, 'INIT WITH TOPIC:', this.topic) : null;
    }

    // custom calculation
    calculate() {
        super.calculate();

        // create fields
        this.temperature = false;
        this.wetbulb = false;

        const fields = Object.keys(this.source);
        fields.forEach(f => this[f] = this.values[this.source[f]]);

        if (!this.temperature || !this.wetbulb)
            return;

        const
            wbT = parseFloat(this.wetbulb),     // wet bulb temperature
            T = parseFloat(this.temperature);   // temperature

        if (!wbT || !T)
            return;

        this.value = this._magic(wbT, T);
    }

    _magic(wbT, T) {
        return T + (this.max - wbT);
    }
}