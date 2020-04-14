
var jwt = require('jsonwebtoken');
var SECRETKEY = "ICS_PROGRAMMER";
var LoggedInUsers = {};
var UsersExpiryTime = {};
var SessionTime = 3600000;

function verifyJWTToken(req, res, successcallback, errorCallback) {
	//console.log(req.headers);
	var token = req.headers["authorization"];
	if (token == null && req.body.tokenViaC) {
		token = req.body.tokenViaC;
	}

	if (token == null && req.query._tVp) {
		token = "Bearer " + req.query._tVp;
	}

	if (token == null) {
		if (!errorCallback) {
			res.status(401);
			res.send({ "success": false, "message": "Authentication missing", "code": "57636" });
			return;
		} else {
			errorCallback({ "success": false, "message": "Authentication missing", "code": "57636" });
			return;
		}
	}

	token = token.split(" ");
	console.log('token' + token);
	console.log(token.length);
	if ((token[1] in LoggedInUsers) && LoggedInUsers[token[1]] == true && (UsersExpiryTime[token[1]] - new Date().getTime()) >= 0) {
		UsersExpiryTime[token[1]] = new Date().getTime() + SessionTime;
		var secret = new Buffer.from(SECRETKEY, "base64");
		var decoded = jwt.verify(token[1], secret, function (err, decoded) {
			if (err) {
				console.log(err);
				if (!errorCallback) {
					res.status(401);
					res.send(err);
				}
				else
					errorCallback(err);
			} else {
				console.log('decoded' + JSON.stringify(decoded));
				successcallback(decoded);
			}
		});
	} else {
		if (token[1] in LoggedInUsers && LoggedInUsers[token[1]] == true) {
			LoggedInUsers[token[1]] = false;
		}
		if (token[1] in UsersExpiryTime) {
			delete UsersExpiryTime[token[1]];
		}
		res.status(401);
		res.send({ "success": false, "message": "Token Expired", "code": "57005" });
		return;
	}

};


function createJWTToken(user) {
	if (user.Id == "") {
		alert("Empty");
	}
	var newUser = {
		email: user.EmailAddress,
		id: user.Id
	};
	var secret = new Buffer.from(SECRETKEY, "base64");
	var token = jwt.sign(newUser, secret);
	LoggedInUsers[token] = true;
	UsersExpiryTime[token] = new Date().getTime() + SessionTime;
	return token;
};

exports.verifyRequest = verifyJWTToken;
exports.createJWTToken = createJWTToken;
