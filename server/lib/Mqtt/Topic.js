import Crypto from 'crypto';

export default class MqttTopic extends MODULECLASS {
    constructor(parent, topicData) {
        super(parent);
        this.label = 'MQTT TOPIC';

        this.maxHistoryLength = parseInt(`${MQTT_MAX_HISTORY_LENGTH}`);
        this.maxHistoryAge = parseInt(`${MQTT_MAX_HISTORY_AGE}`);

        // inital values
        this.history = [];
        this.topic = topicData.topic;
        this.value = topicData.value;
        this.hash = `${Crypto.createHash('md5').update(`${this.topic}`).digest("hex")}`;

        // garbage collector
        this.clearHistoryTimer = setInterval(() => this.clearHistory(), 500);

        this.on('update', () => this.onUpdate());
    }

    update(mqttTopic) {
        this.value = mqttTopic.value;
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

        this.virtualTopics.topics.keys.forEach(t => { // check any virtual topic
            const topic = this.virtualTopics.topics.data[t]; // pick the virtual topic
            if (topic.hasSourceTopic(this.topic)) // has the virtual topic this topic here as source?
                topic.setSourceTopic(this.topic, this.value); // then set the value there (and trigger the calculator)
        });
    }

    get value() {
        return this.history.length > 0 ? this.history[0].value : false;
    }

    set value(val) {
        this.history.unshift({
            value: val,
            time: Date.now()
        });
        this.emit('update');
    }

    get virtualTopics() {
        return APP.VIRTUALTOPICS;
    }

    set virtualTopics(val) {
        // do nothing
    }

}