export default class TopicSource extends MODULECLASS {
    constructor(parent, sourceData) {
        super(parent, sourceData);
        this.label = 'TOPIC SOURCE';
        this.debug = false;

        // the key (prop) is the full topic url
        this.values = new Proxy({}, {
            get: (target, prop, receiver) => {
                return target[prop];
            },

            set: (target, prop, value) => {
                target[prop] = value;

                this.emit('update', prop);
                return true;
            }
        });

        this.on('update', topic => {
            this.debug ? LOG(this.label, 'VALUE UPDATED', topic, this.values[topic], 'FOR', this.topic) : null;

            // elevate the event
            // trigger the calculator
            this.parent.emit('source-update', topic);
        });

        // set data
        this.update(sourceData);

        // get latest values from influx database
        //this.initLatestValues();

    }

    hasTopic(topic) {
        return this.topics.includes(topic);
    }

    setTopic(topic, value) {
        if (!this.hasTopic(topic))
            return;

        this.values[topic] = value;
        this.debug ? LOG(this.label, 'SET TOPIC', topic.padEnd(50, '-'), `${this.values[topic]}`.padEnd(10, '-'), 'FOR  > ', this.topic) : null;
    }

    update(sourceData) {
        if (!sourceData)
            return;

        if (typeof sourceData === 'string') this.type = 'single';
        if (typeof sourceData === 'object') this.type = 'field';
        if (Array.isArray(sourceData)) this.type = 'list';

        // this is the stored raw data
        this.data = sourceData;

        // setTopics (multiple)
        this.topics.forEach(topic => {
            if (this.parent.parent.topics[topic]) {
                if (!this.values[topic]) {
                    //LOG('!!!!!', this.topic, topic, `${this.parent.parent.topics[topic].value}`);
                    this.values[topic] = this.parent.parent.topics[topic].value;
                }
            }
        });

        this.debug ? LOG(this.label, 'UPDATED', `${JSON.stringify(sourceData)}`.padEnd(50, '.'), 'TYPE', this.type, 'DATA', JSON.stringify(this.data)) : null;
    }

    // returns a flatten array with all used topic urls
    getTopics(source) {
        let data = [];
        source = source || this.data;

        if (Array.isArray(source))
            return source;

        if (typeof source === 'string')
            return [source];

        if (typeof source === 'object')
            Object.keys(source).forEach(field => data.push(source[field]));

        return data;
    }

    /*initLatestValues() {
        const proms = [];

        LOG('>>>>>>>>>>LATEST VALUES', this.topic, this.topics);

        this.topics.forEach(topic => {

            const existingValue = this.parent.value;

            LOG('>>>>>>>>>>', existingValue);
            return;

            const fluxQuery = topic => `from(bucket:"${INFLUXDB_BUCKET}")
                        |> range(start: -1d)
                        |> filter(fn: (r) => r._measurement == "${topic}")
                        |> sort(columns: ["time"])`;

            const query = fluxQuery(topic);

            proms.push(this.queryDB(query).then(rows => {

                // preset the source topic value
                if (rows.length > 0)
                    this.setTopic(topic, rows[rows.length - 1].value);

                return Promise.resolve();
            }).catch(error => {
                ERROR(this.label, 'INFLUX ERROR', error);
            }));
        });

        return Promise.all(proms);
    }

    queryDB(query) {
        return APP.INFLUXDB.query(query);
    }
     */

    // --------

    get data() {
        return this._data;
    }

    set data(val) {
        this._data = val;
    }

    get topic() {
        return this.parent.topic;
    }

    set topic(val) {
        // do nothing
    }

    get topics() {
        return this.getTopics();
    }

    set topics(val) {
        // do nothing
    }
}