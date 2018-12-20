
var jwt = require('jsonwebtoken');
var SECRETKEY = "ICS_PROGRAMMER";


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
	console.log(token);
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
			successcallback(decoded);
		}
	});
};


function createJWTToken(user) {
	var newUser = {
		email: user.EmailAddress,
		id: user.Id
	};
	var secret = new Buffer.from(SECRETKEY, "base64");
	var token = jwt.sign(newUser, secret);
	return token;
};

exports.verifyRequest = verifyJWTToken;
exports.createJWTToken = createJWTToken;
