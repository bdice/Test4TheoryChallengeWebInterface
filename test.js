require('http').globalAgent.maxSockets = 100000
var redis = require("redis");
var client = redis.createClient({host:'t4tc-mcplots-db', port:6379});

	    var args1 = [ 'T4TC_MONITOR/TOTAL/PER_USER/jobs_completed', 0, 10, 'WITHSCORES'];
    client.zrevrange(args1, function (err, response) {
        console.log(JSON.stringify(response));
        // write your code here
             });
        

/**
var foo=1;
client.zrevrangebyscore(["T4TC_MONITOR/TOTAL/PER_USER/jobs_completed",0,10,'withscore'], function(err,response){
	JSON.stringify(response);
});
**/

