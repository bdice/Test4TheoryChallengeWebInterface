
// Global includes
var http = require('http')
var https = require('https')
var fs = require('fs')
var path = require('path');
var express = require('express.io')
var redis = require("redis");

// Tuning
http.globalAgent.maxSockets = 100000
https.globalAgent.maxSockets = 100000

// Setup SSL
var SSLoptions = {
	key :  fs.readFileSync('keys/key.pem'),
	cert : fs.readFileSync('keys/cert.pem')
}

// Setup express application
var app = express()
var A = app.https(SSLoptions).io()

////////////////////////////////////////////////
// OAUTH and Log-In configuration
////////////////////////////////////////////////

// Load authentiation config
var authenticationConfig = require("./config.js")

// OAUTH specific params
var passport = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;

// serialize and deserialize
passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

// LOGIN: Facebook
passport.use(new FacebookStrategy(authenticationConfig.facebook,
	function(accessToken, refreshToken, profile, done) {
		process.nextTick(function () {
			return done(null, profile);
		});
	}
));

// LOGIN: Google
passport.use(new GoogleStrategy(authenticationConfig.google,
	function(token, tokenSecret, profile, done) {
		process.nextTick(function () {
			return done(null, profile);
		});
	}
));

// LOGIN: Twitter
passport.use(new TwitterStrategy(authenticationConfig.twitter,
	function(accessToken, refreshToken, profile, done) {
		process.nextTick(function () {
			return done(null, profile);
		});
	}
));

// LOGIN: Boinc
var BoincStrategy = require('./boinc.js')
passport.use(BoincStrategy);


//OAUTH specific params end

////////////////////////////////////////////////
// Express application initialization
////////////////////////////////////////////////


var client = redis.createClient(6379,'t4tc-mcplots-db.cern.ch');

setInterval(function(){

	// var acceleratorList = ['CDF', 'STAR', 'UA1', 'DELPHI', 'UA5', 'ALICE', 'TOTEM', 'SLD', 'LHCB', 'ALEPH', 'LHCF', 'ATLAS', 'CMS', 'OPAL', 'D0'];
	var acceleratorList = [];
	var multi = client.multi();
	
	// //All accelerator field Params
	// for(var i=0;i<acceleratorList.length;i++){
	// 		multi.hgetall("T4TC_MONITOR/"+acceleratorList[i]+"/");
	// 		multi.scard("T4TC_MONITOR/"+acceleratorList[i]+"/users");
	// }

	//TOTAL Stats
	multi.hgetall("T4TC_MONITOR/TOTAL/");
	multi.scard("T4TC_MONITOR/TOTAL/users");
	multi.zrevrange(["T4TC_MONITOR/TOTAL/PER_USER/events",0,10,'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/PER_USER/jobs_completed",0,10,'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/pending/HIST", 0, 100, 'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/online_users/HIST", 0, 100, 'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/monitor-machines/HIST", 0, 100, 'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/monitor-load/HIST", 0, 100, 'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/monitor-alerts/HIST", 0, 100, 'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/jobs_completed/HIST", 0, 100, 'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/jobs_failed/HIST", 0, 100, 'WITHSCORES']);
	multi.keys("T4TC_MONITOR/TOTAL/NEW_USERS/*")
	//multi.get("T4TC_MONITOR/TOTAL/online_users");

	var resultObject = {};
	multi.exec(function(err, replies){
		    replies.forEach(function (reply, index) {


			if(index<acceleratorList.length*2){
				if(index%2==0){
					resultObject[acceleratorList[index/2]] = reply;
				}else {
					if(resultObject[acceleratorList[index/2]]){
						resultObject[acceleratorList[(index-1)/2]]["totalUsers"] = reply
					}
				}
			}else{
				var newIndex = index - acceleratorList.length*2;
				if(newIndex == 0){
					resultObject["TOTAL"] = reply;	
				}else if(newIndex == 1){
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["totalUsers"] = reply;
					}
				}else if(newIndex == 2){
					resultObject["Events Leaderboard"] = reply;
				}else if(newIndex == 3){
					resultObject["Jobs Leaderboard"] = reply;
				}else if(newIndex == 4){
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["pending"] = reply;
					}
				}else if(newIndex == 5) {
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["online_users"] = reply;
					}	
				}else if(newIndex == 6) {
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["monitor_machines"] = reply;
					}	
				}else if(newIndex == 7) {
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["monitor_load"] = reply;
					}	
				}else if(newIndex == 8) {
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["monitor_alerts"] = reply;
					}	
				}else if(newIndex == 9) {
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["jobs_completed_hist"] = reply;
					}	
				}else if(newIndex == 10) {
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["jobs_failed_hist"] = reply;
					}	
				}else if(newIndex == 11) {
					if(resultObject["TOTAL"]){
						resultObject["TOTAL"]["new_users"] = reply.length;
					}	
				}
			}

		    });
		    //console.log(resultObject);

		    app.io.broadcast('update', JSON.stringify(resultObject));  
		    //app.io.broadcast('update', JSON.stringify(replies));  

	});
}, 500);
//Redis Code ends


////////////////////////////////////////////////
// Setup Application
////////////////////////////////////////////////

//Redering Engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//app.use(express.logger());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({ secret: 'my_precious_036129c4c9508c6521605cfea4509d2b' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

// CORS (Cross-Origin Resource Sharing) headers to support Cross-site HTTP requests
app.all('*', function(req, res, next) {
       res.header("Access-Control-Allow-Origin", "*");
       res.header("Access-Control-Allow-Headers", "X-Requested-With");
       res.header('Access-Control-Allow-Headers', 'Content-Type');
       next();
});

// test authentication
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/')
}

// Authentication URLs
// --------------------

//Auth specific
app.get('/account', ensureAuthenticated, function(req, res){
			res.render('account', { user: req.user});
	});

app.get('/auth/facebook',
	passport.authenticate('facebook'),
	function(req, res){
	});
app.get('/auth/facebook/callback',
	passport.authenticate('facebook', { failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/challenge/vlc_login.callback');
	});

app.get('/auth/google',
	passport.authenticate('google', {scope : "profile"}),
	function(req, res){
	});
app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/login' , scope : "profile" }),
	function(req, res) {
		res.redirect('/challenge/vlc_login.callback');
	});

app.get('/auth/twitter',
	passport.authenticate('twitter'),
	function(req, res){
	});
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', { failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/challenge/vlc_login.callback');
	});

app.get('/auth/boinc', function(req, res){
		res.render('login-boinc', {});
	})
app.post('/auth/boinc', function(req, res, next) {
		passport.authenticate('local', function(err, user, info) {
			if (err) {
			        return res.render('login-boinc', {errorMessage: err});
			} else if (!user) {
			        return res.render('login-boinc', {errorMessage: "Could not log-in (" + (info['message'] || "Server error") + ")"});
			} else {
				req.logIn(user, function(err) {
					if (err) return res.render('login-boinc', {errorMessage: err});
					return res.redirect('/challenge/vlc_login.callback');
				});
			}
		})(req, res, next);
	});

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/challenge/vlc_login');
});

app.get('/login', function(req, res){
	if(req.isAuthenticated()){
		res.redirect('/')
	}else {
		res.render('login',{pageTitle:'Test 4 Theory | Login'})
	}
});

// General purpose URLs
// --------------------

// Landing page
app.get('/', function(req, res) {
    res.render('landing', {pageTitle:'Test 4 Theory | Home', user : req.user })
})

app.get('/t4t-hints.html', function(req, res) {
    res.render('doc-hints', { user : req.user })
})

// Accounting information
app.get('/account', function(req, res){
	res.render('vlhc-login', {pageTitle : 'Account', user : req.user});
})
app.get('/account.json', function(req, res){
	res.set("Access-Control-Allow-Origin", "*");
	res.send({ user : req.user || false });
})

// VLHC URLs
// --------------------

// Log user in (logging him out if needed before)
app.get('/vlhc_login', function(req, res){
	if(req.isAuthenticated()){
		// Logout if prompted to log-in
		req.logout();
	}
	// Render the account page
	res.render('vlhc-login', {pageTitle : 'Account', user : req.user});
})

// Logout request
app.get('/vlhc_logout', function(req, res) {
	req.logout();
	res.redirect('/challenge/vlc_login.callback')
});

// Login callback that just forwards the json information to the 
// oppener window and then closes it
app.get('/vlc_login.callback', function(req, res) {
	// Render the account page
	res.render('vlhc-callback', {user : req.user});
});

//top-10

// User Status
app.get('/user_status', function(req, res){

        // Get VM ID from the query
        var vmid = req.query['vmid'];

        var multi = client.multi();
        multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/events", vmid);
        multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/jobs_completed", vmid);
        multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/jobs_failed", vmid);
	multi.zrevrank("T4TC_MONITOR/TOTAL/PER_USER/jobs_completed", vmid);
        multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/cpuusage", vmid);
        multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/diskusage", vmid);

        var events = 0;
        var completed = 0;
        var failed = 0;
	var rank = -1;
	var cpuusage = 0;
	var diskusage = 0;

        multi.exec(function(err,replies){
                //console.log(replies);
                replies.forEach(function(reply, index){
                //console.log(reply==undefined)
                        if(index==0){
                                if(reply){
                                events = parseInt(reply)
                                }
                        }
                        if(index==1){
                                if(reply){
                                completed = parseInt(reply)
                                }
                        }
                        if(index==2){
                                if(reply){
                                failed = parseInt(reply)
                                }
                        }
                        if(index==3){
                                if(reply){
                                rank = parseInt(reply)
                                }
                        }
                        if(index==4){
                                if(reply){
                                cpuusage = parseInt(reply)
                                }
                        }
                        if(index==5){
                                if(reply){
                                diskusage = parseInt(reply)
                                }
                        }
                });

                completed = parseInt(completed) - parseInt(failed);
                // Render
                res.json({
                        vmid : vmid,
                        completed: completed,
                        failed: failed,
                        events: events,
			rank: rank,
			cpuusage: cpuusage,
			diskusage: diskusage
                });
        })


});

// Credits screen
app.get('/vlhc_credits', function(req, res){

	// Get VM ID from the query
	var vmid = req.query['vmid'],
		user = req.query['user'];

	var multi = client.multi();
	multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/events", vmid);
	multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/jobs_completed", vmid);
	multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/jobs_failed", vmid);
	
	var events = 0;
	var completed = 0;
	var failed = 0;
	
	multi.exec(function(err,replies){
		//console.log(replies);
		replies.forEach(function(reply, index){
		//console.log(reply==undefined)
			if(index==0){
				if(reply){
				events = parseInt(reply)
				}
			}
			if(index==1){
				if(reply){
				completed = parseInt(reply)
				}
			}
			if(index==2){
				if(reply){
				failed = parseInt(reply)
				}
			}
		});

		completed = parseInt(completed) - parseInt(failed);
		// Render
		res.render('vlhc-credits', {
			vmid : vmid,
			userName : user,
			completed: completed,
			failed: failed,
			events: events
		});
	})


})
// Backup URLs
// --------------------

app.get('/grid-status', function(req, res){
	res.render('grid-status', {pageTitle : 'Test 4 Theory | Grid Status', user : req.user});
})

app.get('/new', function(req, res){
	res.render('index', {pageTitle : 'Test 4 Theory', user : req.user});
})

////////////////////////////////////////////////
// Server initialization
////////////////////////////////////////////////

//  Serve static files
app.use(express.static(__dirname + '/public')); //Serve direct files from the public directory (To be transferred to a proper static-file server later)
app.listen(443) //HTTPS
console.log("Serving on port 443")

// HTTP -> HTTPS redirect
// Redirect from http port 80 to https
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);



