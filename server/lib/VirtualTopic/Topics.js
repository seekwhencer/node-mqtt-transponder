import fs from 'fs-extra';
import Topic from './Topic.js';

export default class Topics extends MODULECLASS {
    constructor(parent, options) {
        super(parent, options);

        return new Promise((resolve, reject) => {
            this.label = 'VIRTUAl TOPICS';
            this.debug = true;
            this.mappingFile = `${CONF.path}/virtualtopics.json`;

            this.debug ? LOG(this.label, 'INIT') : null;

            this.data = new Proxy({}, {

                get: (target, prop, receiver) => {
                    return target[prop];
                },

                set: (target, prop, topic) => {
                    // add or update
                    if (!target[prop]) { // add if not exists
                        target[prop] = topic;
                        this.emit('topic-added', topic);
                    } else { // or update
                        this.data[prop].update(topic.data);
                        this.emit('topic-update', this.data[prop]);
                    }
                    return true;
                }
            });

            this
                .load()
                .then(data => {
                    data.forEach(topicData => this.add(topicData));
                    resolve(this);
                });
        });
    }

    load() {
        LOG(this.label, 'LOAD', this.mappingFile);
        return fs.readFile(this.mappingFile).then(data => Promise.resolve(JSON.parse(data.toString())));
    }

    write() {
        LOG(this.label, 'WRITE', this.mappingFile);
        const data = this.data.map(t => t.data);
        return fs.writeFile(this.mappingFile, JSON.stringify(data));
    }

    add(topicData) { // or update
        const newTopic = new Topic(this, topicData);
        this.data[newTopic.data.topic] = newTopic;
    }

    get keys() {
        return Object.keys(this.data);
    }

    set keys(val) {
        // do nothing
    }
}
