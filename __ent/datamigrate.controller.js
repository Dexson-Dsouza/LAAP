function createSchema(app, mssql, pool2) {

    var async = require("async");
    var ActiveDirectory = require('activedirectory');
    var adConfig = {
        url: 'ldap://ics.global',
        baseDN: 'dc=ics,dc=global'
    }

    app.get('/api/getadusers', getADUsers);

    app.get('/api/getsqluser', getSQLUsers);

    app.get('/api/syncdata', syncData);

    function getADUsers(callback) {
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
        adConfig.username = "sbhoybar@ics.global";
        adConfig.password = "shriniwas@456";
        var ad = new ActiveDirectory(adConfig);
        ad.findUsers(query, true, function (err, users) {
            if (err) {
                console.log('ERROR: ' + JSON.stringify(err));
                // res.send({ message: err, success: false });
                return;
            }
            if ((!users) || (users.length == 0)) {
                console.log('No users found.');
                // res.send({ message: 'No users found.', success: false });
            }
            else {
                callback(null, users);
            }
        });
    }

    function getSQLUsers(callback, aResult) {
        pool2.then((pool) => {
            var request = pool.request();
            request.query("SELECT * FROM Users").then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                // res.send({ message: "Users retrieved successfully!", success: true, response: data.recordset });
                callback(null, aResult, data.recordset);
            }).catch(function (err) {
                console.log(err);
                // res.send(err);
            });
        });
    }

    function comparer(otherArray) {
        return function (current) {
            return otherArray.filter(function (other) {
                return other.UserName == current.UserName && other.UserName == current.UserName
            }).length == 0;
        }
    }

    // function getNewObjectFromArr() {
    //     a = [{ value: "4a55eff3-1e0d-4a81-9105-3ddd7521d642", display: "Jamsheer" }, { value: "644838b3-604d-4899-8b78-09e4799f586f", display: "Muhammed" }, { value: "b6ee537a-375c-45bd-b9d4-4dd84a75041d", display: "Ravi" }, { value: "e97339e1-939d-47ab-974c-1b68c9cfb536", display: "Ajmal" }, { value: "a63a6f77-c637-454e-abf2-dfb9b543af6c", display: "Ryan" }]
    //     b = [{ value: "4a55eff3-1e0d-4a81-9105-3ddd7521d642", display: "Jamsheer", $$hashKey: "008" }, { value: "644838b3-604d-4899-8b78-09e4799f586f", display: "Muhammed", $$hashKey: "009" }, { value: "b6ee537a-375c-45bd-b9d4-4dd84a75041d", display: "Ravi", $$hashKey: "00A" }, { value: "e97339e1-939d-47ab-974c-1b68c9cfb536", display: "Ajmal", $$hashKey: "00B" }]

    //     var onlyInA = a.filter(comparer(b));
    //     var onlyInB = b.filter(comparer(a));

    //     result = onlyInA.concat(onlyInB);

    //     console.log(result);
    // }

    function syncData(req, res) {
        async.waterfall([
            function (callback) {
                getADUsers(callback);
            },
            function (aResult, callback) {
                getSQLUsers(callback, aResult);
            }
        ], function (err, aResult, bResult) {
            var a = [];
            var b = bResult;
            for (var i = 0; i < aResult.length; i++) {
                var c = {
                    "UserName": aResult[i].sAMAccountName,
                    "DisplayName": aResult[i].displayName,
                    "EmailAddress": aResult[i].mail
                }
                a.push(c);
            }

            var onlyInA = a.filter(comparer(b));
            var onlyInB = b.filter(comparer(a));

            // result = onlyInA.concat(onlyInB);
            result = onlyInB.concat(onlyInA);

            console.log(result);
            res.send(result);
        });
    };

}
module.exports.loadSchema = createSchema;