#!/bin/bash

# load .env file and config file
loadConfig() {
    DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    #@TODO: not only"default" get it from environment variable
    export $(egrep -v '^#' "${DIR}/.env" | xargs)
}

# update the host system
update() {
  apt-get update -y
  apt-get upgrade -y
}

# docker installation
installDocker() {
  apt-get remove docker docker-engine docker.io containerd runc -y
  apt-get update -y
  curl -sSL https://get.docker.com | sh
  sudo usermod -a -G docker pi
}

# create docker volumes
createVolumes() {
    echo ""
    echo "Creating docker volumes"
    echo ""

    docker volume create ${PROJECT_NAME}_influxdb
    docker volume create ${PROJECT_NAME}_influxdb2
    docker volume create ${PROJECT_NAME}_influxetc
    docker volume create ${PROJECT_NAME}_mosquitto
    docker volume create ${PROJECT_NAME}_grafana
}



#----------------------------------------------------------------------------------------------------------------------

loadConfig

echo ""
echo "Update system?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) update; break;;
        No ) break;;
    esac
done

echo ""
echo "Install Docker?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) installDocker; break;;
        No ) break;;
    esac
done

echo ""
echo "Create Docker Volumes?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) createVolumes; break;;
        No ) break;;
    esac
done

echo ""