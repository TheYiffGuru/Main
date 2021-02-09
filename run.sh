#!/bin/bash
cd /opt/TheYiffGuru

while true;
do
	git pull
	git submodule update --recursive
	npm i
	npm run build
	npm start
done
