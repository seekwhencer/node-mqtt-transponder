import fs from 'fs-extra';

import MqttClient from './Client.js';
import MqttTopic from './Topic.js';
import MqttTopicExcludes from './Excludes.js';

export default class Mqtt extends MODULECLASS {
    constructor(parent) {
        super(parent);

        return new Promise((resolve, reject) => {
            this.label = 'MQTT'
            this.parent = parent;
            this.debug = false;
            LOG(this.label, 'INIT | DEBUG', this.debug);

            this.topicsSourceFile = `${CONF.path}/topics.json`;

            // events
            this.on('topic-added', (topic, mqttTopic) => {
                this.debug ? LOG(this.label, 'ADDED  ', topic.padEnd(50, '-'), `${mqttTopic.value}`.padEnd(10, '-'), 'TOPICS COUNT', this.keys.length) : null;
                this.emit(topic, mqttTopic);
            });
            this.on('topic-updated', (topic, mqttTopic) => {
                this.debug ? LOG(this.label, 'UPDATED', topic.padEnd(50, '-'), `${mqttTopic.value}`.padEnd(10, '-'), 'HISTORY LENGTH', mqttTopic.history.length) : null;
                this.emit(topic, mqttTopic);
            });

            // triggered by client
            this.on('message', (topic, value) => {
                this.topicsSource[topic] = {
                    topic: topic,
                    value: value,
                    time: Date.now()
                }
            });

            // latest topic value
            // the key is the topic
            this.topicsSource = new Proxy({}, {
                get: (target, prop, receiver) => target[prop],
                set: (target, topic, data) => {

                    //ignore excludes
                    if (this.excludesSource.contains(topic))
                        return true;

                    // add or update
                    if (!target[topic]) { // not exists
                        target[topic] = new MqttTopic(this, data);
                        this.emit('topic-added', topic, target[topic]);
                    } else { // exists
                        this.topics[topic].update(data);
                        this.emit('topic-updated', topic, this.topics[topic]);
                    }
                    return true;
                }
            });

            //
            this.excludesSource = new MqttTopicExcludes(this);

            // start up
            this.loadExcludes()
                .then(() => this.initClient())
                .then(client => {
                    this.client = client;
                    return Promise.resolve();
                })
                .then(() => this.loadTopics())
                .then(() => this.initLatestValues())
                .then(() => {
                    this.debug ? LOG(this.label, 'LOAD COMPLETE.') : null;
                    this.debug ? LOG(this.label, '+++ TOPICS', this.keys.length) : null;
                    this.debug ? LOG(this.label, '+++ EXCLUDES', this.excludes.length) : null;

                    this.updateAll();
                    this.calculateAll();

                    LOG(this.label, this.keys.map(t => {
                        return {
                            topic: this.topics[t].topic,
                            value: `${this.topics[t].value}`
                        };
                    }));

                    resolve(this);
                });
        });
    }

    initClient() {
        return new MqttClient(this);
    }

    publish(topic, value) {
        if (this.debug) {
            const mqttTopic = this.topics[topic];
            //LOG(this.label, 'PUBLISH', topic.padEnd(50, '-'), `${mqttTopic.value ? `${mqttTopic.value}`.padEnd(10, '-') : null}`, 'HISTORY LENGTH', mqttTopic.history.length);
        }
        this.client.publish(topic, value);
    }

    loadTopics() {
        return new Promise((resolve, reject) => {
            this.debug ? LOG(this.label, 'LOAD', this.topicsSourceFile) : null;

            fs.readFile(this.topicsSourceFile).then((data) => {
                if (data) {
                    const topicsData = JSON.parse(data.toString());
                    topicsData.is_stored = true; // mark topic as from store
                    topicsData.forEach(d => this.topicsSource[d.topic] = d);
                    resolve();
                }
            });
        });
    }

    loadExcludes() {
        return this.excludesSource.load();
    }

    write() {
        this.debug ? LOG(this.label, 'WRITE', this.topicsSourceFile) : null;
        const data = this.data.map(t => t.data);
        return fs.writeFile(this.topicsSourceFile, JSON.stringify(data));
    }

    /**
     * these functions do two things:
     *
     *  1) get all latest values for main topics from topics.json
     *  2) get all latest values for source topics from all main topics
     *
     */
    initLatestValues() {
        this.debug ? LOG(this.label, 'INIT LATEST VALUES') : null;

        let topics = [];

        // get the source topics in a flatten array
        this.keys.forEach(topic => {
            topics = [topic, ...topics, ...this.topics[topic].source.topics];
        });
        topics = [...new Set(topics)];
        topics.sort();

        this.debug ? LOG(this.label, topics) : null;

        const proms = [];
        topics.forEach(topic => {

            // @TODO - get all (!) measures for one day
            const fluxQuery = topic => `from(bucket:"${INFLUXDB_BUCKET}")
                        |> range(start: -1d)
                        |> filter(fn: (r) => r._measurement == "${topic}")
                        |> sort(columns: ["time"])
                        |> last()`;

            const query = fluxQuery(topic);

            proms.push(this.queryDB(query).then(rows => {

                LOG('');
                LOG('>>> ROWS FOR', topic, rows);
                LOG('');

                if (rows.length > 0)
                    if (rows[rows.length - 1].value)
                        if (this.topics[topic]) {   // if the topic comes from topics.json
                            this.topicsSource[topic] = {
                                value: rows[rows.length - 1].value
                            };
                            LOG('>>>>> UPDATE EXISTING TOPIC', topic, this.topicsSource[topic].value);
                        } else { // create the new topic, that is not in the topics.json
                            this.topicsSource[topic] = {
                                topic: topic,
                                value: rows[rows.length - 1].value
                            }
                            LOG('>>>>> CREATE TOPIC', topic, this.topicsSource[topic].value);
                        }

            }).catch(error => {
                ERROR(this.label, 'INFLUX ERROR', error);
            }));
        });

        return Promise.all(proms);
    }

    queryDB(query) {
        return APP.INFLUXDB.query(query);
    }

    calculateAll() {
        this.debug ? LOG(this.label, 'CALCULATING ALL') : null;
        this.keys.forEach(topic => this.topics[topic].calculate());
    }

    updateAll() {
        this.debug ? LOG(this.label, 'UPDATING ALL') : null;
        this.keys.forEach(topic => this.topics[topic].update());
    }

    //
    // getter and setter
    //

    get keys() {
        return Object.keys(this.topics);
    }

    set keys(val) {
        // do nothing
    }

    get excludes() {
        return this.excludesSource.data;
    }

    set excludes(val) {
        // do nothing
    }

    get topics() {
        return this.topicsSource;
    }

    set topics(val) {
        // do nothing
    }
}