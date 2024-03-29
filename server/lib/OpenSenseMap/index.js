import * as OSMClient from 'opensensemap-client';
import fs from 'fs-extra';

export default class OpenSenseMap extends MODULECLASS {
    constructor(parent) {
        super(parent);

        return new Promise((resolve, reject) => {
            this.label = 'OPEN SENSE MAP';
            this.debug = false;

            this.client = OSMClient;
            this.tickRate = parseInt(`${OPENSENSEMAP_TICKRATE}` || 1000);
            this.sensorsDataFile = `${CONF.path}/opensensemap.json`;

            // the box id
            this.id = `${OPENSENSEMAP_ID}` || 'change!me';

            // the authentication token
            this.token = `${OPENSENSEMAP_TOKEN}` || 'change!me';

            LOG(this.label, 'INIT', '| DEBUG:', this.debug);

            // the sensors from the config
            /*this.sensors = OPENSENSEMAP_SENSORS.split(',')
                .map(sensor => {
                        if (sensor.split("").includes(':')) {
                            const s = sensor.split(':');
                            return {
                                sensorId: s[0].trim() || false,
                                topic: s[1].trim() || false,
                                age: parseInt(s[2]) || false,
                                value: false,
                                sendTimestamp: false
                            }
                        }
                    }
                )
                .filter(sensor => sensor ? sensor : null);*/


            this.client
                .getBox(this.id)
                .then(() => this.load())
                .then(() => {
                    this.debug ? LOG(this.label, this.sensors) : null;
                    APP.MQTT.client.on('message', (topic, buffer) => this.message(topic, buffer));
                    resolve(this);
                })
                .catch((e) => ERROR(this.label, e));

            this.timer = setInterval(() => {
                this.sendAll();
            }, this.tickRate);

            //resolve(this);
        });
    }

    sendAll() {
        const now = Date.now() / 1000;
        const data = [];
        this.sensors.forEach(sensor => {
            !sensor.sendTimestamp ? sensor.sendTimestamp = 0 : null;
            const dead = parseInt(sensor.sendTimestamp) + parseInt(sensor.age);

            if (now >= dead && sensor.value) {
                sensor.sendTimestamp = now;
                data.push({
                    sensor: sensor.id,
                    value: sensor.value
                });
            }
        });

        this.debug ? LOG(this.label, 'SEND ALL', data) : null;

        // fire
        if (data.length > 0) {
            this.send(data);
        }
    }

    send(data) {
        this.debug ? LOG(this.label, 'SENDING', data) : null;
        this.client.postNewMeasurements(this.id, data, this.token).catch(e => ERROR(this.label, e));
    }

    /**
     * assign values to sensors
     *
     * @param topic
     * @param buffer
     */
    message(topic, buffer) {
        const topics = this.sensors.map(sensor => sensor.topic);
        const value = parseFloat(buffer);

        if (!topics.includes(topic)) {
            return;
        }

        // set the value in the sensors array
        const sensor = this.sensors.filter(s => s.topic === topic)[0];
        sensor.value = value;
    }

    load() {
        return new Promise((resolve, reject) => {
            this.debug ? LOG(this.label, 'LOAD', this.sensorsDataFile) : null;

            fs.readFile(this.sensorsDataFile).then((data) => {
                if (data) {
                    this.sensors = JSON.parse(data.toString());
                    resolve();
                }
            });
        });
    }

}