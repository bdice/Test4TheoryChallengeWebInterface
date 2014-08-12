var http = require('http')
var https = require('https')
var fs = require('fs')

var authenticationConfig = require("./config.js")

http.globalAgent.maxSockets = 100000
https.globalAgent.maxSockets = 100000

var SSLoptions = {
	key :  fs.readFileSync('keys/key.pem'),
	cert : fs.readFileSync('keys/cert.pem')
}

//OAUTH specific params
var passport = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var SamlStrategy = require('passport-saml').Strategy;



// serialize and deserialize
passport.serializeUser(function(user, done) {
done(null, user);
});
passport.deserializeUser(function(obj, done) {
done(null, obj);
});

// config
passport.use(new FacebookStrategy(authenticationConfig.facebook,
function(accessToken, refreshToken, profile, done) {
 process.nextTick(function () {
   return done(null, profile);
 });
}
));

passport.use(new GoogleStrategy(authenticationConfig.google,
function(token, tokenSecret, profile, done) {
	process.nextTick(function () {
		return done(null, profile);
	});
}
));

passport.use(new TwitterStrategy(authenticationConfig.twitter,
function(accessToken, refreshToken, profile, done) {
 process.nextTick(function () {
   return done(null, profile);
 });
}
));

/**

passport.use(new SamlStrategy(
  {
    entryPoint: 'https://login-dev.cern.ch/adfs/ls/',
    issuer: 'CERN Test 4 Theory',
	callbackURL: "https://t4tc-mcplots-web.cern.ch:7076/auth/cern/callback"
  },
function(accessToken, refreshToken, profile, done) {
 process.nextTick(function () {
   return done(null, profile);
 });
}

));

**/



//OAUTH specific params end


var path = require('path');
var express = require('express.io')
var app = express()

var A = app.https(SSLoptions).io()

var redis = require("redis");
var client = redis.createClient({host:'t4tc-mcplots-db', port:6379});

setInterval(function(){

	var acceleratorList = ['CDF', 'STAR', 'UA1', 'DELPHI', 'UA5', 'ALICE', 'TOTEM', 'SLD', 'LHCB', 'ALEPH', 'LHCF', 'ATLAS', 'CMS', 'OPAL', 'D0'];
	var multi = client.multi();
	
	//All accelerator field Params
	for(var i=0;i<acceleratorList.length;i++){
			multi.hgetall("T4TC_MONITOR/"+acceleratorList[i]+"/");
			multi.scard("T4TC_MONITOR/"+acceleratorList[i]+"/users");

	}

	//TOTAL Stats
	multi.hgetall("T4TC_MONITOR/TOTAL/");
	multi.scard("T4TC_MONITOR/TOTAL/users");
	multi.zrevrange(["T4TC_MONITOR/TOTAL/PER_USER/events",0,10,'WITHSCORES']);
	multi.zrevrange(["T4TC_MONITOR/TOTAL/PER_USER/jobs_completed",0,10,'WITHSCORES']);
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
				}
			}
		    });
		    //console.log(resultObject);

		    app.io.broadcast('update', JSON.stringify(resultObject));  
		    //app.io.broadcast('update', JSON.stringify(replies));  

	});
}, 500);
//Redis Code ends


//setting up app

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
app.use(express.logger());



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
		res.redirect('/');
	});

app.get('/auth/google',
	passport.authenticate('google', {scope : "profile"}),
	function(req, res){
	});
app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/login' , scope : "profile" }),
	function(req, res) {
		res.redirect('/account');
	});
app.get('/auth/twitter',
	passport.authenticate('twitter'),
	function(req, res){
	});
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', { failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/account');
	});


/**
app.get('/auth/cern',
  passport.authenticate('saml', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  }
);
//CERN custom callback
app.get('/auth/cern/callback',
	passport.authenticate('saml', { failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/account');
	});
**/

app.get('/logout', function(req, res){
req.logout();
res.redirect('/');
});

// test authentication
function ensureAuthenticated(req, res, next) {
if (req.isAuthenticated()) { return next(); }
res.redirect('/')
}

app.get('/login', function(req, res){
	if(req.isAuthenticated()){
		res.redirect('/')
	}else {
		res.render('login',{pageTitle:'Test 4 Theory | Login'})
	}
});


//Auth specific code end



//Setup index route.
app.get('/', function(req, res) {
    res.render('index', {pageTitle:'Test 4 Theory | Home', user : req.user })
})

app.use(express.static(__dirname + '/public')); //Serve direct files from the public directory (To be transferred to a proper static-file server later)

app.listen(443) //HTTPS

console.log("Serving on port 443")

// HTTP -> HTTPS redirect
// Redirect from http port 80 to https
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);



