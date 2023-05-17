import fs from 'fs-extra';
import path from 'path';

export default class MqttTopicExcludes extends MODULECLASS {
    constructor(parent, options) {
        super(parent);
        this.parent = parent;
        this.debug = false;

        this.label = 'MQTT TOPIC EXCLUDES';
        LOG(this.label, 'INIT');

        this.excludesFile = path.resolve(`${CONF.path}/excludes.json`);
        this.data = [];
    }

    load() {
        return new Promise((resolve, reject) => {
            this.debug ? LOG(this.label, 'LOAD', this.excludesFile) : null;
            fs.readFile(this.excludesFile, (err, data) => {
                if (err)
                    reject(err);

                if (data) {
                    this.data = JSON.parse(data.toString());
                    resolve(data);
                }
            });
        });
    }

    write() {
        return new Promise((resolve, reject) => {
            LOG(this.label, 'WRITE', this.excludesFile);
            fs.writeFile(this.excludesFile, JSON.stringify(this.data), (err, data) => {
                resolve(data);
            });
        });
    }

    add(topic) {
        return new Promise((resolve, reject) => {

            if (this.contains(topic)) {
                resolve(false);
                return;
            }

            this.data.push(topic);
            this.write().then(() => resolve(true));
        });
    }

    remove(topic) {
        return new Promise((resolve, reject) => {
            LOG(this.label, 'REMOVE', topic, '');

            this.data = this.data.filter(t => t !== topic);

            //@TODO - this is not a promise...
            this.write();
            resolve(true);
        });
    }

    contains(topic) {
        return this.data.includes(topic);
    }
}