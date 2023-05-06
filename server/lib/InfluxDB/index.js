import {InfluxDB, Point, HttpError} from '@influxdata/influxdb-client';

//@TODO
// https://github.com/influxdata/influxdb-client-js/

export default class influxDB extends MODULECLASS {
    constructor(parent) {
        super(parent);

        return new Promise((resolve, reject) => {
            this.label = 'INFLUX CLIENT';
            this.debug = true;
            LOG(this.label, 'INIT', `| DEBUG: ${this.debug}`);

            this.parent = parent;

            this.options = {
                url: `http://${SERVER_INFLUXDB_HOST}:${SERVER_INFLUXDB_PORT}`,
                token: INFLUXDB_TOKEN
            };

            this.influx = new InfluxDB(this.options);
            this.client = this.influx.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET, 'ms');
            this.queryApi = this.influx.getQueryApi(INFLUXDB_ORG);

            resolve(this);
        });
    }

    /**
     *
     * @param topic String
     * @param data Object
     */
    messageJSON(topic, data) {
        if (data.charAt(0) === '{') {
            data = JSON.parse(data);
        }

        const payload = {
            ...data,
            timestamp: Date.now() * 1000 * 1000
        };

        this.message(topic, payload);
    }

    /**
     *
     * @param topic String
     * @param payload String JSON.stringify()
     */
    message(topic, payload, clientId) {

        if (RegExp(MQTT_INFLUX_ROOT_TOPIC, 'gi').test(topic) !== true)
            return;

        let value = parseFloat(payload);
        const point = new Point(topic);
        //point.timestamp(Date.now() * 1000 * 1000);

        if (payload === 0) {
            value = parseFloat(payload);
        }

        if (!value && value !== 0) {
            point.stringField('value', payload);
            this.debug ? LOG(this.label, 'WRITE STRING:', `"${payload}"`.padEnd(39, '_'), '>', topic) : null;
        }

        if (value === 0)
            value = "0.00";

        if (value || value === 0) {
            point.floatField('value', value);
            this.debug ? LOG(this.label, 'WRITE FLOAT:', `${value}`.padEnd(40, '_'), '>', topic) : null;
        }

        this.client.writePoint(point);
    }

    query(query) {
        return new Promise((resolve, reject) => {
            // returning rows
            const data = [];

            //
            const observer = {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    data.push({
                        topic: o._measurement, time: o._time, value: o._value
                    });
                },

                error(error) {
                    reject(error);
                },

                complete() {
                    resolve(data);
                }
            }

            this.queryApi.queryRows(query, observer);
        });
    }


}