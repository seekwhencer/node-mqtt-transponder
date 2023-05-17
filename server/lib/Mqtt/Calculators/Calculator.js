import Psychrometrics from '../Psychrometrics.js';

export default class Calculator extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);
        this.label = 'CALCULATOR';
        this.debug = false; //this.parent.debug;

        this.pm = new Psychrometrics();
        this.pm.SetUnitSystem(this.pm.SI);
        this.precision = 4;
    }

    calculate() {
        this.debug ? LOG(this.label, 'CALCULATE FOR:', this.topic) : null;
    }

    publish() {
        this.parent.publish(this.value);
    }

    get value() {
        return this._value;
    }

    set value(val) {
        if (typeof val === 'number') {
            this._value = val.toPrecision(this.parent.data.precision || this.precision);
        } else {
            this._value = val;
        }

        // don't set the value: publish it, receive it, add it
        this.publish();
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

    get transform() {
        return this.parent.data.transform;
    }

    set transform(val){
        // do nothing
    }

    get topicsIncoming() {
        return this.parent.source.topics;
    }

    set topicsIncoming(val) {
        // do nothing
    }
}