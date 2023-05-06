# node-mqtt-transponder

... a mqtt transponder and influx bridge as mono repo, dockerized.

- Comes as Docker-Compose Setup with:
  - **[influxDB]()**
  - **[mosquitto]()**
  - **[grafana]()**
  - this app as the server
- Write a single value from all child topics from a root topic down in a influx database. Is a mqtt to influx bridge.
- Send data to **[open sense map](opensensemap.org)**
- Create new “virtual” topics (VT) that is transponding source topics to a new topic.
- Any VT calculates a value from multiple source topics.
- Calculators:
  - Wet Bulb
  - Dew Point
  - Average
  - Absolute Humidity
  - Map
  - Funnel (TODO)
- Web user interface for the server app to: (TBD)
  - monitor all topics
  - create VT at runtime
  - update VT, (properties, change calculator,  add/assign or remove source topics)
  - display filter incoming topics listing by keyword in topic url
  - multiple keywords to filter incoming topic url listing
  - enable / disable VT calculating (idle)
  - enable / disable VT publishing (silent)
  - display defined VT  listing with filter like incoming topics
  - order VT listing by last publish / topic url
  - filter VT listing by: incomplete/complete, enabled/disabled,  

## Setup
- take Ubuntu 22 server image without desktop
- install docker and docker compose, create docker volumes
    ```bash
    # use your home folder
    cd ~
    
    # clone repo
    git clone https://github.com/seekwhencer/node-mqtt-transponder.git transponder
    
    # the folder
    cd transponder # or: /home/pi/transponder or: ~/transponder
    
    # make the setup script runable
    chmod +x ./setup.sh
    
    # run the script not as sudo
    ./setup.sh
    ```


## Config

duplicate *.example files as *

- edit the file `.env`
- edit the file `server/config/default.conf`
- edit the file `mosquitto/mosquitto.conf`


## Influx setup
- start influx
    ```bash
    docker-compose -f docker-compose-influx.yml up -d
    ```

- get the auth token

    ```bash
    docker exec node-mqtt-transponder_influxdb2 influx auth list --hide-headers | cut -f 3
    ```

- put the token in: `.env` as `INFLUXDB_TOKEN`


## Run

- ```bash
  docker-compose up -d
  ```
  > Now open: http://YOURHOST:3000