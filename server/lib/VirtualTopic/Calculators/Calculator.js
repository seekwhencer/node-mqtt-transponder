import Psychrometrics from '../Psychrometrics.js';

export default class Calculator extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);
        this.label = 'CALCULATOR';
        this.debug = this.parent.debug;

        this.pm = new Psychrometrics();
        this.pm.SetUnitSystem(this.pm.SI);
    }

    get value() {
        return this._value;
    }

    set value(val) {
        if (typeof val === 'number') {
            this._value = val.toPrecision(this.parent.data.precision || 4);
        } else {
            this._value = val;
        }

        // elevate the value to the virtual topic
        this.parent.value = this.value;
    }

    get topic() {
        return this.parent.data.topic;
    }

    set topic(val) {
        // do nothing
    }

    get source() {
        return this.parent.source.data;
    }

    set source(val) {
        // do nothing
    }

    get values() {
        return this.parent.source.values;
    }

    set values(val) {
        // do nothing
    }
}