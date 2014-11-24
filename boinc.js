
var http = require("http");
var crypto = require('crypto');
var parseXMLString = require('xml2js').parseString

var passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy;

function boinc_api(query, callback) {
	// Prepare request options
    var options = {
        host: 'lhcathome2.cern.ch',
        path: '/vLHCathome/' + query
    };

    // Handle response
	var handle_response = function(response) {
	  var str = '';
	  // Another chunk of data has been recieved, so append it to `str`
	  response.on('data', function (chunk) { str += chunk; });
	  // The whole response has been recieved, so we just print it out here
	  response.on('end', function () {
	    // Handle response
	    parseXMLString(str, function(err, result) {
	    	if (err) {
	    		callback(null);
	    	} else {
	    		callback(result);
	    	}
	    });
	  });
	}

	// Send HTTP Request
	http.request(options, handle_response).end();
}

function boinc_login(arg_email, arg_password, callback) {
	
	// Create password hash
	var md5sum = crypto.createHash('md5');
	md5sum.update(arg_password + arg_email.toLowerCase());

	// Send boinc API query
	boinc_api("lookup_account.php?email_addr="+arg_email+"&passwd_hash="+md5sum.digest('hex')+"&get_opaque_auth=1", function(data) {
		if (!data) {
			callback(false, "Could not parse response!" );
		} else if (data['error'] != undefined) {
			callback(false, data['error']['error_msg'] || "Could not handle response!" );
		} else {
			if ((data['account_out'] == undefined) || (data['account_out']['authenticator'] == undefined)) {
				callback(false, "The server did not reply with an authenticator ID");
			} else {

				// We have an authenticator
				var auth = data['account_out']['authenticator'][0];

				// Get account details
				boinc_api("am_get_info.php?account_key=" + auth, function(data) {
					if (!data) {
						callback(false, "Could not parse response!" );
					} else if (data['error'] != undefined) {
						callback(false, data['error']['error_msg'] || "Could not handle response!" );
					} else if (data['am_get_info_reply'] == undefined) {
						callback(false, "Could not get user accunt information");
					} else {
						var rec = data['am_get_info_reply'];
						callback({
							'id': rec['id'][0],
							'name': rec['name'][0],
							'country': rec['country'][0],
							'weak_auth': rec['weak_auth'][0],
							'cpid': rec['cpid'][0],
							'authenticator': auth,
							'provider': 'boinc'
						});
					}
				});

			}
		}
	});

}

/**
 * Export the BOINC Local Strategy for Passport
 */
module.exports = new LocalStrategy(
	function(username, password, done) {
		// Perform BOINC login
		boinc_login( username, password , function(user, error) {
			if (!user) {
				return done(null, false, { message: error });
			} else {
				return done(null, user)
			}
		});
	}
);

