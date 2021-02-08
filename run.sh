#!/bin/bash
cd /opt/TheYiffGuru

while true;
do
	git pull
	npm run build
	npm start
done
