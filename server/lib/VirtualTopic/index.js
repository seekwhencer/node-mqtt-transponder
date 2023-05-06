import Topics from './Topics.js';

export default class VirtualTopics extends MODULECLASS {
    constructor(parent) {
        super(parent);

        return new Promise((resolve, reject) => {
            this.label = 'VIRTUAL TOPICS ROOT';
            LOG(this.label, 'INIT');

            new Topics(this).then(topics => {
                this.topics = topics;
                resolve(this);
            });

        });
    }
}