#!/usr/bin/env bash
set -e


if [ -z "${PACKAGE_MAINTAINER_NAME}" ] \
|| [ -z "${PACKAGE_MAINTAINER_EMAIL}" ]
then
	echo "Missing PACKAGE_MAINTAINER_* env vars" 2>&1
	exit 1
fi


# log each command
set -x

# make sure that the dist folder exists
mkdir -p dist

# travis "ubuntu trusty" workaround for wine
# wine is only needed for compiling the application (nw-builder)
sudo dpkg --add-architecture i386
sudo apt-get update -qq
sudo apt-get -qq -o=Dpkg::Use-Pty=0 install -y wine >/dev/null

# fpm
sudo gem install -q fpm

# compile the application and package it
grunt clean:dist dist:all
