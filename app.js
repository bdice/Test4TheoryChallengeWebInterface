// Global includes
var http    = require('http')
var https   = require('https')
var fs      = require('fs')
var path    = require('path');
var express = require('express.io')
var redis   = require('redis');
var crypto  = require('crypto');

var siteName = "Gigabit Challenge";

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
//var A = app.https(SSLoptions).io()
var A = app.http().io()

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
// Setup Application
////////////////////////////////////////////////

// Connect to REDIS
var client = redis.createClient(6379,'t4tc-mcplots-db.cern.ch');
client.on("error", function (err) {
	console.log("REDIS Error: " + err);
});

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

// Get user VMID using by his/her profile
function getVMID( user ) {

	// Prepend provider ID
	var uuid = "u-"+user['id'];
	if (user['provider'] == "facebook") {
		uuid = "f-"+user['id'];
	} else if (user['provider'] == "google") {
		uuid = "g-"+user['id'];
	} else if (user['provider'] == "twitter") {
		uuid = "t-"+user['id'];
	} else if (user['provider'] == "boinc") {
		uuid = "b-"+user['id'];
	}

	// Hash password
	var sha256 = crypto.createHash('sha256');
	sha256.update(uuid);
	return sha256.digest('hex');

}

// Keep user record
function keepUserDetails( user ) {
	// If user is invalid exit
	if (!user) return;
	// Keep the user record under his/her VMID
	var vmid = getVMID( user );
	client.hset("T4TC_MONITOR/USERINFO", vmid, JSON.stringify(user));
}

// Get user record by his/her VMID
function getUserDetails( vmid, callback ) {

	// Get the user record
	client.hget("T4TC_MONITOR/USERINFO", vmid, function(err, reply) {
		if (reply == null) {
			callback(null);
		} else {
			var data = JSON.parse(reply);
			callback(data);
		}
	});

}

// Locate user banner
function getUserPicture( user ) {
	if (user['provider'] == "facebook") {
		return '//graph.facebook.com/'+user['id']+'/picture';
	} else if (user['provider'] == "google") {
		return user['_json']['picture'];
	} else if (user['provider'] == "twitter") {
		return user['photos'][0]['value'];
	} else if (user['provider'] == "boinc") {
		return 'http://lhcathome2.cern.ch/vLHCathome/user_profile/images/'+user['id']+'.jpg';
	}
	return "style/img/award.png"; // Default is anonymous
}

// Include a user in the mailing list
function includeInMailingList( user, email ) {
	// If user is invalid exit
	if (!user) return;
	// Keep the user record under his/her VMID
	var vmid = getVMID( user );
	client.hset("T4TC_MONITOR/MAILING_LIST", vmid, JSON.stringify(user));
}

// Exclude user from the mailing list
function excludeFromMailingList( user ) {

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
		keepUserDetails(req.user);
		res.redirect('/challenge/vlc_login.callback');
	});

app.get('/auth/google',
	passport.authenticate('google', {scope : "profile"}),
	function(req, res){
	});
app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/login' , scope : "profile" }),
	function(req, res) {
		keepUserDetails(req.user);
		res.redirect('/challenge/vlc_login.callback');
	});

app.get('/auth/twitter',
	passport.authenticate('twitter'),
	function(req, res){
	});
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', { failureRedirect: '/login' }),
	function(req, res) {
		keepUserDetails(req.user);
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
					keepUserDetails(user);
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
		res.render('login',{pageTitle: siteName +' | Login'})
	}
});

// General purpose URLs
// --------------------

// Landing page
app.get('/', function(req, res) {
    res.render('landing', {pageTitle: siteName +' | Home', user : req.user })
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
	// Save the anonymous ID if specified and it's a random one (r-XXXXXX)
	var anonvmid = req.query['anonvmid'];
	if (anonvmid && (anonvmid[0] == "r")) {
		req.session.anonvmid = anonvmid;
	} else {
		req.session.anonvmid = null;
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
	// If we have anonymous ID information, import it
	if (req.session.anonvmid && req.user) {
		var fromVMID = req.session.anonvmid,
			toVMID = getVMID(req.user);

		// TODO: Import credits

		//Get the data about the fromVMID user
		var multi = client.multi();
		multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/events", fromVMID); //0
		multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/jobs_completed", fromVMID); //1
		multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/jobs_failed", fromVMID); //2
		multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/cpuusage", fromVMID); //3
		multi.zscore("T4TC_MONITOR/TOTAL/PER_USER/diskusage", fromVMID); //4


        var new_events = 0;
        var new_jobs_completed = 0;
        var new_jobs_failed = 0;
        var new_cpuusage = 0;
        var new_diskusage = 0;

        multi.exec(function(err, replies){
        	if(!err){
        		new_events = parseInt(replies[0]);
        		new_jobs_completed = parseInt(replies[1]);
        		new_jobs_failed = parseInt(replies[2]);
        		new_cpuusage = parseInt(replies[3]);
        		new_diskusage = parseInt(replies[4]);

        		var update_multi = client.multi();
        		update_multi.zincrby("T4TC_MONITOR/TOTAL/PER_USER/events", toVMID, new_events);
        		update_multi.zincrby("T4TC_MONITOR/TOTAL/PER_USER/jobs_completed", toVMID, new_jobs_completed);
        		update_multi.zincrby("T4TC_MONITOR/TOTAL/PER_USER/jobs_failed", toVMID, new_jobs_failed);
        		update_multi.zincrby("T4TC_MONITOR/TOTAL/PER_USER/cpuusage", toVMID, new_cpuusage);
        		update_multi.zincrby("T4TC_MONITOR/TOTAL/PER_USER/diskusage", toVMID, new_diskusage);

        		update_multi.zrem("T4TC_MONITOR/TOTAL/PER_USER/events", fromVMID);
        		update_multi.zrem("T4TC_MONITOR/TOTAL/PER_USER/jobs_completed", fromVMID);
        		update_multi.zrem("T4TC_MONITOR/TOTAL/PER_USER/jobs_failed", fromVMID);
        		update_multi.zrem("T4TC_MONITOR/TOTAL/PER_USER/cpuusage", fromVMID);
        		update_multi.zrem("T4TC_MONITOR/TOTAL/PER_USER/diskusage", fromVMID);

        		//Store this merge in our records
        		update_multi.hset("T4TC_MONITOR/TOTAL/SCORE_MERGE", fromVMID+"__"+toVMID+"__"+(new Date().getTime()).toString(), (new Date().getTime()).toString()) ; // Add a hash with from_to_timestamp as key and timestamp as value

        		update_multi.exec(function(err, replies){
        			if(!err){
        				//TODO: Insert Callback for Operation Successful
        				// Append 'imported' to the user profile
        				req.user['imported'] = true;
        			}else{
        				//TODO: Insert Callback for import failed
        			}
        		})

        	}else{
        		//TODO :: Write callback for import failed !!
        	}
        })


	}
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
		show_control = (req.query['control'] == 1);

	// Get user details
	getUserDetails(vmid, function(user) {

		// If the user record is not kept in the database, use the fallback mechanism
		if (!user) {
			// Get username from URL
			var userName = req.query['user'];
			user = {
				'provider': 'none',
				'displayName': userName
			}
		}

		// Prepare multi trasaction to REDIS
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

			// Split username in two lines
			var nameFirstLine="Anonymous", nameSecondLine="";
			if (user['displayName']) {
				nameFirstLine = user['displayName'].split(" ")[0];
				nameSecondLine = user['displayName'].substr(nameFirstLine.length+1);
			}

			// Render
			res.render('vlhc-credits', {
				vmid : vmid,
				user : user,
				picture: getUserPicture( user ),
				userName : nameFirstLine + "<br />" + nameSecondLine,
				completed: completed,
				failed: failed,
				control: show_control,
				events: events
			});
		})

	});

})
// Backup URLs
// --------------------

app.get('/grid-status', function(req, res){
	res.render('grid-status', {pageTitle : siteName +' | Grid Status', user : req.user});
})

app.get('/new', function(req, res){
	res.render('index', {pageTitle : siteName, user : req.user});
})

////////////////////////////////////////////////
// Server initialization
////////////////////////////////////////////////

//  Serve static files
app.use(express.static(__dirname + '/public')); //Serve direct files from the public directory (To be transferred to a proper static-file server later)
app.listen(8080) //HTTP
console.log("Serving on port 8080")

/*
// HTTP -> HTTPS redirect
// Redirect from http port 80 to https
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(8000);
*/
