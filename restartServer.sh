#!/bin/bash

echo "Killing node processes."
killall node
echo "Starting node server."
(
	node app.js 2>server.err >server.out
)&
