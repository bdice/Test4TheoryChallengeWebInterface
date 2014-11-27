
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
	multi.get("T4TC_MONITOR/TOTAL/pending");
	multi.get("T4TC_MONITOR/TOTAL/online_users");

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
		res.redirect('/challenge/acc.io');
	});

app.get('/auth/google',
	passport.authenticate('google', {scope : "profile"}),
	function(req, res){
	});
app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/login' , scope : "profile" }),
	function(req, res) {
		res.redirect('/challenge/acc.io');
	});

app.get('/auth/twitter',
	passport.authenticate('twitter'),
	function(req, res){
	});
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', { failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/challenge/acc.io');
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
					return res.redirect('/challenge/acc.io');
				});
			}
		})(req, res, next);
	});

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/challenge/acc.io');
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

// Accounting information
app.get('/account', function(req, res){
	res.render('account-io', {pageTitle : 'Account', user : req.user});
})
app.get('/account.json', function(req, res){
	res.set("Access-Control-Allow-Origin", "*");
	res.send({ user : req.user || false });
})

// VLHC URLs
// --------------------

// Log user in (logging him out if needed before)
app.get('/vlhc/login', function(req, res){
	if(req.isAuthenticated()){
		// Logout if prompted to log-in
		req.logout();
		res.redirect('/challenge/vlhc/login');
	}
	// Render the account page
	res.render('account-io', {pageTitle : 'Account', user : req.user});
})

// Credits screen
app.get('/vlhc/credits', function(req, res){
	res.render('credits', {
		pageTitle : 'Account',
		user : req.user
	});
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



