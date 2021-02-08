#!/bin/bash
cd /opt/TheYiffGuru

while true;
do
	git pull
	npm i
	npm run build
	npm start
done
