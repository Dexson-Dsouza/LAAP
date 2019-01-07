function createSchema(app, mssql, pool2, fs) {
    var jwtToken = require("./jwt.controller");
    var ActiveDirectory = require('activedirectory');
    var adConfig = {
        url: 'ldap://ics.global',
        baseDN: 'dc=ics,dc=global'
    }

    app.post('/api/authenticate', authenticate);

    function authenticate(req, res) {
        var ad = new ActiveDirectory(adConfig);

        var username = new Buffer.from(new Buffer.from(req.body.clientId, 'base64').toString(), 'base64').toString();
        username = username.split("@")[0] + "@ics.global"
        var password = new Buffer.from(new Buffer.from(req.body.clientToken, 'base64').toString(), 'base64').toString();
      
        ad.authenticate(username, password, function (err, auth) {
            if (err) {
                console.log('ERROR: ' + JSON.stringify(err));
                res.send({ message: "Username or password incorrect", success: false, code: "5001" });
                return;
            }

            if (auth) {
                console.log('Authenticated!');
                console.log(auth);
                getUserDetails(username.split("@")[0], res);
            }
            else {
                console.log('Authentication failed!');
                res.send({ message: 'Authentication failed!', success: false, code: "5001" });
            }
        });
    }

    function getUserDetails(username, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.input('username', mssql.VarChar(2000), username);
            request.execute("sp_GetUserDetailsByUsername").then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "User retrieved successfully!", success: true, response: data.recordset[0], token: jwtToken.createJWTToken(data.recordset[0]) });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    app.get('/getDir', (req, res) => {
        var username = 'sbhoybar@ics.global';
        var password = 'shriniwas@456';
        var ad = new ActiveDirectory(adConfig);
        ad.userExists(username, function (err, exists) {
            if (err) {
                console.log('ERROR: ' + JSON.stringify(err));
                res.send({ message: err, success: false });
                return;
            }
            console.log(username + ' exists: ' + exists);
            res.send({ message: username + ' exists: ' + exists, success: true })
        });
    })

    app.get('/getUsers', (req, res) => {
        var query = {
            filter: '(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(givenName=*))',
            attributes: ['mail',
                'userPrinicipalName',
                'st',
                'l',
                'department',
                'company',
                'title',
                'co',
                'telephoneNumber',
                'employeeNumber',
                'mobile',
                'sAMAccountName',
                'givenName',
                'displayName',
                'picture',
                'sn',
                'dn']
        }
        var ad = new ActiveDirectory(adConfig);
        ad.findUsers(query, true, function (err, users) {
            if (err) {
                console.log('ERROR: ' + JSON.stringify(err));
                res.send({ message: err, success: false });
                return;
            }
            if ((!users) || (users.length == 0)) {
                console.log('No users found.');
                res.send({ message: 'No users found.', success: false });
            }
            else {
                res.send({ message: "User List retrieved successfully!", success: true, response: users });
            }
        });

    })

    app.get('/getUserDetails', (req, res) => {
        var attributes = {
            user: [
                'mail',
                'userPrinicipalName',
                'st',
                'l',
                'department',
                'company',
                'title',
                'co',
                'telephoneNumber',
                'employeeNumber',
                'mobile',
                'sAMAccountName',
                'givenName',
                'displayName',
                'picture',
                'sn',
                'dn',
                'thumbnailPhoto'
            ]
        }
        var adConfig = {
        url: 'ldap://ics.global',
        baseDN: 'dc=ics,dc=global'
    }
        var sAMAccountName = 'abhol';
        adConfig.attributes = attributes;
        // Find user by a sAMAccountName
        var ad = new ActiveDirectory(adConfig);
        ad.findUser(sAMAccountName, function (err, user) {
            if (err) {
                console.log('ERROR: ' + JSON.stringify(err));
                res.send({ message: err, success: false });
                return;
            }
            if (!user) {
                console.log('User: ' + sAMAccountName + ' not found.');
                res.send({ message: 'User: ' + sAMAccountName + ' not found.', success: false });
            }
            else {
                console.log(JSON.stringify(user));
                var rest=user.thumbnailPhoto;
                fs.writeFile("Thumb.jpg", user.thumbnailPhoto, function(err) {
                    if(err) {
                    console.log("errror writing thumbnail: "+err);
                    } else {
                    console.log("thumbnail was saved!");
                    }})
                res.send({ message: "User Details retrieved successfully!", success: true, response: user })
            };
        });
    })


}
module.exports.loadSchema = createSchema;