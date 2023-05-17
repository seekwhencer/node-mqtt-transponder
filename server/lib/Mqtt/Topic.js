import TopicSource from "./TopicSource.js";
import * as Calculators from "./Calculators/index.js";

export default class MqttTopic extends MODULECLASS {
    constructor(parent, topicData) {
        super(parent);
        this.label = 'TOPIC';
        this.debug = false;

        // options
        this.maxHistoryLength = parseInt(`${MQTT_MAX_HISTORY_LENGTH}`);
        this.maxHistoryAge = parseInt(`${MQTT_MAX_HISTORY_AGE}`);
        this.repeatPublishTime = parseInt(`${MQTT_REPEAT_PUBLISH}`) * 1000; // in ms
        this.maxPublishAge = parseInt(`${MQTT_MAX_PUBLISH_AGE}`) * 1000; // in ms

        // the value history
        this.history = [];

        // the data
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

        // garbage collector
        this.clearHistoryTimer = setInterval(() => this.clearHistory(), 500);

        // events
        this.on('update', () => this.onUpdate());
        this.on('source-update', () => this.calculate());

        this.source = false;
        this.calculator = false;

        // add the initial data
        this.update(topicData);

    }

    update(topicData) {

        if (!topicData) {
            this.emit('update');
            return;
        }

        const options = {...topicData};

        // set the value, if exists in data
        topicData.value ? this.value = topicData.value : null;

        // agnostic get data properties
        delete options.value;  // without value, if exists
        delete options.calculator;  // without calculator, if exists
        delete options.source;      // without source, if exists
        Object.keys(options).forEach(key => this.data[key] = options[key]);

        // create a new or update the source and the calculator class object.
        // the source topic(s) could be:
        //
        //  - a topic string like:              '/my/topic/humidity'
        //  - an array with topic strings like: ['/my/topic/humidity', '/my/topic/temperature']
        //  - a key - value object like:        { humidity: '/my/topic/humidity', temperature: '...' }
        //

        topicData.source ? this.source = topicData.source : null;
        topicData.source ? this.calculator = topicData.calculator : null;

        // initial mapping from proxy
        this.data.value = () => this.value;
        this.data.time = () => this.time;
        this.source ? this.source.data ? this.data.source = () => this.source.data : null : null;
        this.calculator ? this.calculator.name ? this.data.calculator = () => this.calculator.name : null : null;

        this.emit('update');
    }

    clearHistory() {
        // store latest value
        let latest = false;
        this.history.length > 0 ? latest = this.history[0] : null;

        this.clearHistoryByAge();
        this.clearHistoryByLength();

        // restore latest value
        this.history.length === 0 && latest ? this.history.push(latest) : null;
    }

    clearHistoryByAge() {
        if (this.maxHistoryAge === -1)
            return

        const age = Date.now() - (this.maxHistoryAge * 1000);
        this.history = this.history.filter(v => v.time > age);
    }

    clearHistoryByLength() {
        if (this.maxHistoryLength === -1)
            return

        this.history = this.history.slice(0, this.maxHistoryLength - 1);
    }

    onUpdate() {
        //
        // find virtual topics who need this topic as source topic
        // and set their source value to this.value
        //

        this.debug ? LOG(this.label, 'ON UPDATE', this.topic) : null;
        this.parent.keys.forEach(t => {
            const topic = this.parent.topics[t];
            topic.source.setTopic(this.topic, this.value);
        });
    }

    addRepeatPublishTimer() {
        //clearInterval(this.repeatPublishTimer);
        //this.repeatPublishTimer = setInterval(() => this.publish(), this.repeatPublishTime);
    }

    publish(value) {
        if (!value)
            return;

        //if (this.time > Date.now() - this.maxPublishAge)
        //    return;

        this.parent.publish(this.topic, value);
        this.debug ? LOG(this.label, 'PUBLISHING', this.topic, value.toString()) : null;
    }

    /*
        hasSourceTopic(topic) {
            if (!this.source)
                return false;

            return this.source.hasTopic(topic);
        }

        setSourceTopic(topic, value) {
            if (!this.source)
                return false;

            this.source.setTopic(topic, value);
        }
    */
    calculate() {
        if (!this.calculator)
            return;

        this.calculator.calculate();
    }

    //
    // getter and setter
    //
    get keys() {
        return Object.keys(this.data);
    }

    set keys(val) {
        // do nothing
    }

    get topic() {
        return this.data.topic;
    }

    set topic(val) {
        // do nothing
    }

    get value() {
        return this.history.length > 0 ? this.history[0].value : false;
    }

    set value(val) {
        if (!val)
            return;

        this.clearHistory();
        this.history.unshift({
            value: val,
            time: Date.now()
        });
    }

    get time() {
        return this.history.length > 0 ? this.history[0].time : false;
    }

    set time(val) {
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