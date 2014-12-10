#!/bin/bash


killall node
(
	node app.js 2>server.err >server.out
)&
