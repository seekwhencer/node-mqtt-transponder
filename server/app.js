console.clear();
console.log('');
console.log('');
console.log('---------------');
console.log('');

import './lib/Globals.js';
import Config from '../shared/lib/Config.js';
import WebServer from './lib/Server/index.js';
import Mqtt from './lib/Mqtt/index.js';
import InfluxDB from './lib/InfluxDB/index.js';
import OpenSenseMap from './lib/OpenSenseMap/index.js';

export default class WeatherStation extends MODULECLASS {
    constructor() {
        super();

        global.APP = this;

        return new Config(this)
            .then(config => {
                global.CONF = config;
                global.CONFIG = config.configData;
                return new InfluxDB(this);
            })
            .then(influxdb => {
                global.APP.INFLUXDB = influxdb;
                return new Mqtt(this);
            })
            .then(mqtt => {
                global.APP.MQTT = mqtt;
                return new WebServer(this);
            })
            .then(webserver => {
                global.APP.WEBSERVER = webserver;
                return new OpenSenseMap(this);
            })
            .then(opensensemap => {
                global.APP.OPENSENSEMAP = opensensemap;
                return Promise.resolve(this);
            });

    }
}