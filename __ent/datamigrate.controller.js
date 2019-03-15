var thisapp, thismssql, thispool2;
var ActiveDirectory = require('activedirectory');
var jwtToken = require("./jwt.controller");
var adConfig = {
    url: 'ldap://ics.global',
    baseDN: 'dc=ics,dc=global'
}
var async = require("async"),
    fs = require("fs-extra"),
    format = require('pg-format');

var invalidRequestError = {
    name: "INVALID_REQUEST",
    code: "50079",
    msg: "your request has been rejected due to invalid request parameters"
};

function createSchema(app, mssql, pool2) {
    thisapp = app;
    thismssql = mssql;
    thispool2 = pool2;

    app.get('/api/getadusers', getADUsers);

    app.get('/api/getsqluser', getSQLUsers);

    app.get('/api/syncdata', syncDataFromWeb);

    app.get('/api/addusersfromadtosql', addUserFromADToSQL);

    app.get('/api/getadlastsync', getAdLastSync);
}

function syncDataFromWeb(req, res) {
    jwtToken.verifyRequest(req, res, decodedToken => {
        console.log("===Sync Data valid token===");
        if (decodedToken.email) {
            syncData(req, res);
        } else {
            res.status("401");
            res.send(invalidRequestError);
        }
    });
}

function getADUsers(callback, res) {
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
    adConfig.username = "training@ics.global";
    adConfig.password = "Infinite234$";
    var ad = new ActiveDirectory(adConfig);
    ad.findUsers(query, true, function (err, users) {
        if (err) {
            console.log('ERROR: ' + JSON.stringify(err));
            try {
                if (res) {
                    res.send({ message: err, success: false });
                }
            } catch (err) {
                console.log("AD SYNC FAILED");
            }
        }
        if ((!users) || (users.length == 0)) {
            console.log('No users found.');
            isErr = true;
        }
        else {
            callback(null, users);
        }

    });
    // fs.readFile('static/user_data.json', 'utf8', function (err, data) {
    //     if (err) throw err;
    //     objList = JSON.parse(data);
    //     callback(null, objList);
    // })
}

function getSQLUsers(callback, aResult) {
    thispool2.then((pool) => {
        var request = pool.request();
        request.query("SELECT * FROM Users").then(function (data, recordsets, returnValue, affected) {
            thismssql.close();
            // res.send({ message: "Users retrieved successfully!", success: true, response: data.recordset });
            callback(null, aResult, data.recordset);
        }).catch(function (err) {
            console.log(err);
            // res.send(err);
            // callback(null, aResult, { message: JSON.stringify(err), success: false, code: 40009 });
        });
    });
}

function syncData(req, res) {
    console.log("=========== Sync operation start ===========");
    console.log(new Date());
    console.log("===========  +++++++++++++++++++ ===========");
    async.waterfall([
        function (callback) {
            getADUsers(callback, res);
        },
        function (aResult, callback) {
            getSQLUsers(callback, aResult);
        }
    ], function (err, aResult, bResult) {
        if (typeof (aResult) == "undefined") {
            console.log(".......AD SYNC FAILED......SYNC AGAIN.........");
            console.log(aResult);
            syncData(req, res);
        }
        //variable a for AD Data
        //variable b for SQL data
        var a = [];
        var b = bResult;
        for (var i = 0; i < aResult.length; i++) {
            var __o = aResult[i];
            var c = {
                "UserName": __o.sAMAccountName,
                "EmployeeCode": null,
                "EmailAddress": __o.mail,
                "Designation": __o.title,
                "Department": __o.department,
                "IsDeleted": false,
                "IsActive": true,
                "Photo": null,
                "DisplayName": __o.displayName,
                "Mobile": __o.mobile,
                "TelephoneNumber": __o.telephoneNumber,
                "City": __o.l,
                "State": __o.st,
                "Country": __o.co
            }
            a.push(c);
        }
        //array of objects which are changed in Active Directory
        var onlyInA = a.filter(comparer(b));
        //array of objects in sql 
        var onlyInB = b.filter(comparer(a));

        if (onlyInA.length) {
            console.log("====Data Updated/Inserted in AD=====");
            console.log(onlyInA);
            console.log("=========================");
            console.log(onlyInB);
            migrateData(onlyInA);
        } else {
            console.log("====No Data Updated/Inserted in AD=====");
            console.log(onlyInA);
        }
        if (onlyInB.length) {
            var deletedUsers = onlyInB.filter(usernameComparer(onlyInA));
            console.log(deletedUsers);
            if (deletedUsers.length) {
                deleteUsers(deletedUsers);
            }
        } else {
            console.log("====No Data Deleted from AD=====");
            console.log(onlyInB);
        }
        if (res) {
            res.send({ message: "Data sync completed", success: true });
        }
        var __z = {
            Message: "Sync Operation Performed successfully by system.",
            Date: new Date().getTime(),
            Status: 1
        }
        addAdSyncData(__z);
    });
};

function migrateData(arr) {
    async.eachSeries(arr,
        function (user, callback) {
            console.log("====UPDATE/INSERT Syncing MSSQL Operation=====");
            console.log(user);
            thispool2.then(pool => {
                var request = pool.request();
                request.input("UserName", thismssql.VarChar(100), user.UserName);
                request.input("EmployeeCode", thismssql.VarChar(100), user.EmployeeCode);
                request.input("EmailAddress", thismssql.VarChar(100), user.EmailAddress);
                request.input("Designation", thismssql.VarChar(100), user.Designation);
                request.input("Department", thismssql.VarChar(100), user.Department);
                request.input("IsDeleted", thismssql.VarChar(100), user.IsDeleted);
                request.input("IsActive", thismssql.VarChar(100), user.IsActive);
                request.input("Photo", thismssql.VarChar(100), user.Photo);
                request.input("DisplayName", thismssql.VarChar(100), user.DisplayName);
                request.input("Mobile", thismssql.VarChar(100), user.Mobile);
                request.input("TelephoneNumber", thismssql.VarChar(100), user.TelephoneNumber);
                request.input("City", thismssql.VarChar(100), user.City);
                request.input("State", thismssql.VarChar(100), user.State);
                request.input("Country", thismssql.VarChar(100), user.Country);

                request.execute("sp_AddUpdateRemoveUser").then(function (data, recordsets, returnValue, affected) {
                    thismssql.close();
                    console.log(user.UserName + " Is updated/added in our database");
                    callback();
                }).catch(function (err) {
                    console.log(err);
                    callback();
                });
            });
        }
    );
}

function deleteUsers(arr) {
    async.eachSeries(arr,
        function (user, callback) {
            console.log("====DELETE SYNC MSSQL Operation=====");
            console.log(user);
            thispool2.then(pool => {
                var request = pool.request();
                request.input("UserName", thismssql.VarChar(100), user.UserName);
                request.input("IsDeleted", thismssql.VarChar(100), 1);
                request.input("IsActive", thismssql.VarChar(100), 0);
                request.execute("sp_AddUpdateRemoveUser").then(function (data, recordsets, returnValue, affected) {
                    thismssql.close();
                    console.log(user.UserName + " Is deleted from the database");
                    callback();
                }).catch(function (err) {
                    console.log(err);
                    callback();
                });
            });
        }
    );
}


function comparer(otherArray) {
    return function (current) {
        return otherArray.filter(function (other) {
            return other.UserName == current.UserName && other.Designation == current.Designation
                && other.Department == current.Department && other.DisplayName == current.DisplayName
                && other.Mobile == current.Mobile && other.TelephoneNumber == current.TelephoneNumber
                && other.IsDeleted == current.IsDeleted && other.City == current.City
                && other.State == current.State && other.Country == current.Country
        }).length == 0;
    }
}

function usernameComparer(otherArray) {
    return function (current) {
        return otherArray.filter(function (other) {
            return other.UserName == current.UserName
        }).length == 0;
    }
}

function addUserFromADToSQL(req, res) {

    fs.readFile('static/user_data.json', 'utf8', function (err, data) {
        if (err) throw err;
        objList = JSON.parse(data);
        thispool2.then((pool) => {
            var request = pool.request();
            var arrV = [];
            for (let z = 0; z < objList.length; z++) {
                var o = objList[z];
                console.log(o);
                var g = [o.sAMAccountName, null, o.mail, o.title, o.department, 0, 1, null, o.displayName, o.mobile, o.telephoneNumber, o.l, o.st, o.co];
                arrV.push(g);
            }
            var qu = format('INSERT INTO Users(UserName,EmployeeCode,EmailAddress,Designation,Department,IsDeleted,IsActive,Photo,DisplayName,Mobile,TelephoneNumber, City, State, Country) VALUES %L', arrV);
            request.query(qu).then(function (data, recordsets, returnValue, affected) {
                thismssql.close();
                // res.send({ message: "Users retrieved successfully!", success: true, response: data.recordset });
                res.send(data);
            }).catch(function (err) {
                console.log(err);
                // res.send(err);
            });
        });
    })
}

function addAdSyncData(__o) {
    thispool2.then(pool => {
        var request = pool.request();
        request.input("Message", thismssql.VarChar(500), __o.Message);
        request.input("Date", thismssql.VarChar(100), __o.Date);
        request.input("RunBy", thismssql.Int, __o.RunBy);
        request.input("Status", thismssql.Int, __o.Status);
        request.execute("sp_AddAdSyncData").then(function (data, recordsets, returnValue, affected) {
            thismssql.close();
            console.log("Sync operation performed!!")
        }).catch(function (err) {
            console.log(err);
        });
    });
}

function getAdLastSync(req, res) {
    jwtToken.verifyRequest(req, res, decodedToken => {
        console.log("===Sync Data valid token===");
        if (decodedToken.email) {
            pool2.then((pool) => {
                var request = pool.request();
                console.log(req.query);
                var query = "SELECT TOP 1 * FROM AdSync ORDER BY Id DESC";
                request.query(query).then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    res.send({ message: "Last Ad Sync Received successfully!", success: true, response: data.recordset });
                }).catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
            });
        } else {
            res.status("401");
            res.send(invalidRequestError);
        }
    });
}

module.exports.loadSchema = createSchema;
exports.syncData = syncData;