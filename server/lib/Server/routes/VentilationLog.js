import Route from '../Route.js';

export default class extends Route {
    constructor(parent, options) {
        super(parent, options);

        this.queryApi = global.APP.INFLUXDB.queryApi;
        // the source window contact topics
        this.topics = [
            {'Hof, rechts': 'sensors/room/living/window/hintenrechts/contact'},
            {'Schlafzimmer': 'sensors/room/sleeping/window/contact'},
            {'Straße, links': 'sensors/room/living/window/vornelinks/contact'},
            {'Straße, rechts': 'sensors/room/living/window/vornerechts/contact'},
            {'Bad': 'sensors/room/bath/window/contact'},
            {'Bühne': 'sensors/room/stage/window/contact'}
        ];
        // the additional fields from this topics per row
        this.topicsPerRow = [
            {temperature_outdoor: 'sensors/outdoor/temperature/average'},
            {humidity_outdoor: 'sensors/outdoor/humidity/average'},
            {temperature_indoor: 'sensors/rooms/temperature/average'},
            {humidity_indoor: 'sensors/rooms/humidity/average'},
            {temperature_sleeping: 'sensors/room/sleeping/temperature'},
            {humidity_sleeping: 'sensors/room/sleeping/humidity'},
            {temperature_living: 'sensors/room/wozi/temperature'},
            {humidity_living: 'sensors/room/wozi/humidity'},
            {temperature_bath: 'sensors/room/bath/temperature'},
            {humidity_bath: 'sensors/room/bath/humidity'}];

        // the route without url parameters
        this.router.get('/ventilation', (req, res) => {
            const params = [new Date().getFullYear()];
            const output = req.query.type || 'json';

            this.action(params).then(data => {
                output === 'json' ? res.json(data) : null;
                output === 'csv' ? res.end(this.transformToCSV(data)) : null;
            });
        });

        // the route with url parameters
        this.router.get(/(.+\/)?ventilation(.+)/i, (req, res) => {
            const params = this.extractPath(req.path, 'ventilation/');
            const output = req.query.type || 'json';

            this.action(params).then(data => {
                output === 'json' ? res.json(data) : null;
                output === 'csv' ? res.end(this.transformToCSV(data)) : null;
            });

        });

        return this.router;
    }

    /**
     * this is the entry action for the route
     *
     * @param params
     * @param req
     * @param res
     * @returns {Promise<unknown>}
     */
    action(params, req, res) {
        return this
            .getData(params)
            .then(data => {

                let countTopicsPerRowComplete = 0;
                data = processData(data);

                return new Promise((resolve, reject) => {
                    this.topicsPerRow.forEach(tpr => {
                        const field = Object.keys(tpr)[0];
                        const topic = tpr[field];

                        this.getSensorData(data, topic, field).then(d => {
                            data = d;
                            countTopicsPerRowComplete++;
                            countTopicsPerRowComplete === this.topicsPerRow.length ? resolve(data) : null;
                        });
                    });
                });
            })
            .then(data => {
                data = flatData(data);
                data = orderData(data, 'start');
                return data;
            });
    }

    /*
    get the data for the contact sensors by topic
    and return an array[topic] = [] as promise
     */
    getData(params) {
        return new Promise((resolve, reject) => {
            const year = parseInt(params[0]) || new Date().getFullYear();
            let month = parseInt(params[1]);
            let day = parseInt(params[2]);

            let yearEnd = year;
            let monthEnd = `${month + 1}`.padStart(2, '0');

            if (!day) day = 1;

            if (!month) {
                month = 1;
                yearEnd = year + 1;
                monthEnd = 1;
            }

            if (month === 12) {
                yearEnd = year + 1;
                monthEnd = 1;
            }

            month = `${parseInt(month)}`.padStart(2, '0');
            day = `${parseInt(day)}`.padStart(2, '0');
            monthEnd = `${parseInt(monthEnd)}`.padStart(2, '0');

            let countCompleteTopics = 0;
            const data = {};
            const fluxQuery = topic => `from(bucket:"${INFLUXDB_BUCKET}")
                |> range(start: ${year}-${month}-${day}T00:00:00Z, stop: ${yearEnd}-${monthEnd}-01T00:00:00Z)
                |> filter(fn: (r) => r._measurement == "${topic}")
                |> sort(columns: ["time"])`;

            this.topics.forEach(t => {
                const field = Object.keys(t)[0];
                const topic = t[field];

                const query = fluxQuery(topic);
                this
                    .queryDB(query)
                    .then(rows => {
                        data[topic] = rows;
                        countCompleteTopics++;
                        countCompleteTopics === this.topics.length ? resolve(data) : null;
                    })
                    .catch(() => {
                        countCompleteTopics++;
                        countCompleteTopics === this.topics.length ? resolve(data) : null;
                    });
            });
        });
    }

    getSensorData(data, topic, field) {
        return new Promise((resolve, reject) => {

            const queries = {};
            const topics = Object.keys(data);
            let countCompleteTopics = 0;
            const countCompletePoints = {};

            topics.forEach(t => {
                queries[t] = [];

                data[t].length === 0 ? countCompleteTopics++ : null;
                countCompleteTopics === topics.length ? resolve(data) : null;

                for (let i = 0; i < data[t].length; i++) {
                    countCompletePoints[t] = 0;

                    const o = data[t][i];
                    const fluxQuery = topic => `from(bucket:"${INFLUXDB_BUCKET}")
                        |> range(start: ${o.start}, stop: ${o.end})
                        |> filter(fn: (r) => r._measurement == "${topic}")
                        |> sort(columns: ["time"])`;

                    const query = fluxQuery(topic);

                    this.queryDB(query).then(rows => {
                        if (rows.length > 0) {
                            const first = rows[0].value;
                            const last = rows[rows.length - 1].value;

                            data[t][i][field] = {};
                            data[t][i][field].start = first;
                            data[t][i][field].end = last;
                        }

                        countCompletePoints[t]++;
                        countCompletePoints[t] === data[t].length ? countCompleteTopics++ : null;
                        countCompleteTopics === topics.length ? resolve(data) : null;
                    }).catch(error => {
                        countCompletePoints[t]++;
                        countCompletePoints[t] === data[t].length ? countCompleteTopics++ : null;
                        countCompleteTopics === topics.length ? resolve(data) : null;
                    });
                }
            });
        });
    }


    queryDB(query) {
        return new Promise((resolve, reject) => {
            const data = [];
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

    /**
     * takes a flatten data array
     * @param data
     */
    transformToCSV(data) {
        let csv = '';
        const emptyFieldValue = '';
        const spacer = '|';
        const fields = ['topic', 'start', 'duration'];
        const sensorFields = this.topicsPerRow.map(i => Object.keys(i)[0]);

        data.forEach(row => {
            const fieldsData = [];
            const sensorFieldsData = [];
            fields.forEach(field => {
                if (row[field]) {
                    if (field === 'topic') {
                        const name = this.topics.filter(i => Object.values(i)[0] === row[field]).map(i => Object.keys(i)[0])[0];
                        fieldsData.push(name);
                    } else if (field === 'start') {
                        fieldsData.push(new Date(row[field]).getDate());
                        fieldsData.push(`${`${new Date(row[field]).getHours()}`.padStart(2, '0')}:${`${new Date(row[field]).getMinutes()}`.padStart(2, '0')}`);
                    } else {
                        fieldsData.push(row[field]);
                    }
                } else {
                    fieldsData.push(emptyFieldValue);
                }
            });
            csv += fieldsData.join(spacer);
            csv += spacer;

            sensorFields.forEach(f => {
                if (row[f]) {
                    sensorFieldsData.push(row[f]['start']);
                    sensorFieldsData.push(row[f]['end']);
                } else {
                    sensorFieldsData.push(emptyFieldValue);
                    sensorFieldsData.push(emptyFieldValue);
                }
            });
            csv += sensorFieldsData.join(spacer);
            csv += "\n";
        });

        csv = csv.replace(/\./g, ',');

        return csv;
    }
}


/**
 * take only usable data points, because there are many
 * repeated data points in the result, like: 0 1 1 0 0 1 1
 *
 * @param data{}
 * @returns data
 */
const processData = data => {
    const processedData = {};
    const topics = Object.keys(data);
    topics.forEach(t => {
        processedData[t] = [];
        for (let i = 0; i < data[t].length; i++) {
            if (i === 0 && data[t][i].value === 0) {
                processedData[t].push(data[t][i]);
            }

            if (i > 0) {
                if (data[t][i].value === 0 && data[t][i - 1].value === 1) {
                    processedData[t].push(data[t][i]);
                }

                if (data[t][i].value === 1 && data[t][i - 1].value === 0) {
                    processedData[t].push(data[t][i]);
                }
            }
        }
        processedData[t] = getDuration(processedData[t]);
        processedData[t] = processedData[t].filter(r => r.duration).map(r => {
            return {
                topic: r.topic, start: r.time, end: r.end, duration: r.duration
            }
        });
    });
    return processedData;
}


const getDuration = rows => {
    if (!rows) {
        return rows;
    }

    for (let i = 0; i < rows.length; i++) {
        if (rows[i + 1]) {
            if (rows[i].value === 0 && rows[i + 1].value === 1) {
                if (rows[i + 1]) {
                    rows[i].duration = calcDuration(new Date(rows[i].time).getTime(), new Date(rows[i + 1].time).getTime())
                    rows[i].end = rows[i + 1].time;
                }
            }
        }
    }
    return rows;
}

const calcDuration = (date1, date2) => {
    let distance = Math.abs(date1 - date2);
    const hours = Math.floor(distance / 3600000);
    distance -= hours * 3600000;
    const minutes = Math.floor(distance / 60000);
    distance -= minutes * 60000;
    const seconds = Math.floor(distance / 1000);
    return `${hours}:${('0' + minutes).slice(-2)}:${('0' + seconds).slice(-2)}`;
}

const flatData = data => {
    const topics = Object.keys(data);
    const flatten = [];
    topics.forEach(topic => data[topic].forEach(row => flatten.push(row)));
    return flatten;
}

const orderData = (data, field) => {
    return ksortObjArray(data, field);
}

