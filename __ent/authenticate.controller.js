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
            request.execute("sp_GetEmpDetailsByUsername").then(function (data, recordsets, returnValue, affected) {
                console.log(data.recordset[0]);
                if (typeof (data.recordset[0]) != "undefined") {
                    var request = pool.request();
                    request.input("userId", mssql.Int, data.recordset[0].Id);
                    request.execute("sp_GetEmployeeDetails").then(function (data, recordsets, returnValue, affected) {
                        var request = pool.request();
                        request.input("userid", mssql.Int, data.recordset[0].Id);
                        request.execute("sp_GetManagerDetails").then(function (data2, recordsets, returnValue, affected) {
                            data.recordset[0]['manangerDetails']=data2.recordset;
                            mssql.close();
                            res.send({
                                message: "User retrieved successfully!",
                                success: true,
                                response: data.recordset[0],
                                token: jwtToken.createJWTToken(data.recordset[0])
                            });
                        })
                    })
                }
                else {
                    res.send({
                        message: "User not authorized!",
                        success: false,
                        code: 5002
                    })
                }
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }
}
module.exports.loadSchema = createSchema;