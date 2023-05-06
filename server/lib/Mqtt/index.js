import MqttClient from './Client.js';
import MqttTopic from './Topic.js';

export default class Mqtt extends MODULECLASS {
    constructor(parent) {
        super(parent);

        return new Promise((resolve, reject) => {
            this.label = 'MQTT'
            LOG(this.label, 'INIT');
            this.parent = parent;

            this.on('topic-added', (topic, mqttTopic) => {
                //LOG(this.label, 'ADDED', topic, mqttTopic.value);
                this.emit(topic, mqttTopic);
            });

            this.on('topic-updated', (topic, mqttTopic) => {
                //LOG(this.label, 'UPDATED', topic, mqttTopic.history.length, mqttTopic.value);
                this.emit(topic, mqttTopic);
            });

            // latest topic value
            // the key is the topic
            this.topics = new Proxy({}, {
                get: (target, prop, receiver) => target[prop],
                set: (target, topic, mqttTopic) => {
                    // add or update
                    if (!target[topic]) {
                        target[topic] = mqttTopic;
                        this.emit('topic-added', topic, target[topic]);
                    } else {
                        this.topics[topic].update(mqttTopic);
                        this.emit('topic-updated', topic, this.topics[topic]);
                    }
                    return true;
                }
            });

            // triggered by client
            this.on('message', (topic, value) => this.addTopic(topic, value));

            // create the connection
            new MqttClient(this)
                .then(client => {
                    this.client = client;
                    resolve(this);
                });

        });
    }

    addTopic(topic, value) {
        this.topics[topic] = new MqttTopic(this, {
            topic: topic,
            value: value
        });
    }

    publish(topic, value) {
        this.client.publish(topic, value);
    }

    get keys() {
        return Object.keys(this.data);
    }

    set keys(val) {
        // do nothing
    }
}