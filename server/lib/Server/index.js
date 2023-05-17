import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import expressWs from 'express-ws';
import * as Routes from './routes/index.js';

export default class WebServer extends MODULECLASS {
    constructor(parent) {
        super(parent);
        return new Promise((resolve, reject) => {
            this.label = 'WEBSERVER';
            this.debug = false;

            LOG(this.label, 'INIT', '| DEBUG:', this.debug);

            this.parent = parent;
            this.port = SERVER_PORT || 3000;

            process.env.NODE_ENV === 'production' ? this.env = 'prod' : this.env = 'dev';
            //this.documentRoot = path.resolve(`${process.cwd()}/../frontend/dist/${this.env}`);
            this.documentRoot = path.resolve(`${process.cwd()}/../frontend/dist/prod`);
            const icon = `${this.documentRoot}/favicon.ico`;
            const jsonTopicsData = path.resolve(`${process.cwd()}/../config/topics.json`);

            global.EXPRESS = express;
            this.engine = EXPRESS();
            this.ws = expressWs(this.engine);


            // websocket connection
            this.engine.ws('/live', (ws, req) => {
                ws.on('message', msg => {
                    ws.send(msg);
                });
            });

            // statics
            this.documentRoot = path.resolve(`${APP_DIR}/${SERVER_FRONTEND_PATH}`);

            // favicon
            this.engine.get('/favicon.ico', (req, res) => {
                if (fs.existsSync(icon)) {
                    res.setHeader('Content-Type', 'application/json');
                    res.sendFile(icon);
                } else {
                    res.end();
                }
            });

            // static data @the moment
            this.engine.get('/topics', (req, res) => {
                if (fs.existsSync(jsonTopicsData)) {
                    res.sendFile(jsonTopicsData);
                } else {
                    res.end();
                }
            });

            Object.keys(Routes).forEach(route => this.engine.use(`/`, new Routes[route](this)));

            // the websocket connection


            // start
            this.engine.listen(this.port, () => {
                LOG(this.label, 'IS LISTENING ON PORT:', this.port);
                resolve(this);
            });
        });
    }
}