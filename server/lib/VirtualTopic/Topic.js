import Crypto from 'crypto';
import * as Calculators from './Calculators/index.js';
import TopicSource from './TopicSource.js';

export default class Topic extends MODULECLASS {
    constructor(parent, topicData) {
        super(parent, topicData);
        this.label = 'VIRTUAL TOPIC';
        this.debug = false;
        this.debug ? LOG(this.label, 'INIT WITH DATA', topicData.topic) : null;

        /**
         * this.options will be fed from the virtualtopics.json
         * equals one entry
         */
        this.data = new Proxy({}, {
            get: (target, prop, receiver) => {
                return target[prop];
            },

            set: (target, prop, value) => {
                target[prop] = value;

                this.emit('topic-update', prop);
                return true;
            }
        });

        // triggered from this.source
        this.on('source-update', () => this.calculate());
        this.update(topicData);
    }

    update(topicData) {
        const options = {...topicData};

        this.data.hash = `${Crypto.createHash('md5').update(`${options.topic}`).digest("hex")}`;

        // get agnostic @TODO do NOT agnostic, but with type convert
        delete options.calculator;  // without calculator
        delete options.source;      // without source
        Object.keys(options).forEach(key => this.data[key] = options[key]);

        // map data for source and calculator
        this.data.source = () => this.source.data;
        this.data.calculator = () => this.calculator.name;

        // create a new or update the source and the calculator class object.
        // the source topic(s) could be:
        //
        //  - a topic string like:              '/my/topic/humidity'
        //  - an array with topic strings like: ['/my/topic/humidity', '/my/topic/temperature']
        //  - a key - value object like:        { humidity: '/my/topic/humidity', temperature: '...' }
        //

        this.source = topicData.source;             // this
        this.calculator = topicData.calculator;
    }

    // called from Mqtt/Topic.js
    hasSourceTopic(topic) {
        return this.source.hasTopic(topic);
    }

    // called from Mqtt/Topic.js
    setSourceTopic(topic, value) {
        this.source.setTopic(topic, value);
    }

    calculate() {
        this.calculator.calculate();
    }

    publish() {
        if (!this.value)
            return;

        this.debug ? LOG(this.parent.label, this.label, 'MQTT PUBLISH', this.data.topic, this.value) : null;
        APP.MQTT.publish(this.data.topic, this.value.toString());
    }

    //----

    get value() {
        return this._value;
    }

    set value(val) {
        this._value = val;
        this.publish();
    }

    get topics() {
        return this.parent;
    }

    set topics(val) {
        // do nothing
    }

    get source() {
        return this._source;
    }

    set source(sourceData) {
        if (!this._source) {     // create the source object
            this._source = new TopicSource(this, sourceData);
        } else {                // update the source object
            this.source.update(sourceData);
        }
    }

    get calculator() {
        return this._calculator;
    }

    set calculator(name) {
        const CalculatorClass = Calculators[name];
        if (!CalculatorClass)
            return false;

        if (!this.calculator) { // create new if not exists
            this._calculator = new CalculatorClass(this);
        } else {
            if (this.calculator.name !== name) { // create new if exists but changed the calculator
                this._calculator = new CalculatorClass(this);
            } else { // update if exists and the calculator is the same as before
                this.calculator.update(name);
            }
        }
    }
}