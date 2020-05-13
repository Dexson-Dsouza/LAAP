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
    //GenerateReport();
    app.get('/api/syncdata', syncDataFromWeb);
}

function connectToDatabase2() {
    var pooll;
    var config = {
        user: "App",
        password: "Etime123#",
        server: "192.168.1.223",
        port: 1433,
        database: "APP93",
        options: {
            encrypt: false
        },
        connectionTimeout: 300000,
        requestTimeout: 300000,
        pool: {
            idleTimeoutMillis: 300000,
            max: 100
        }
    };
    pooll = new thismssql.ConnectionPool(config)
        .connect()
        .then(pool1 => {
            console.log("Connected to 2nd Db");
            sync(pool1);
        })
        .catch(err => {
            console.log("Database Connection Failed! Bad Config: ", err)
        });
}

function sync(pool1) {
    thispool2.then((pool) => {
        var request1 = pool.request();
        request1.query('select top 1 AttendanceLogId from AttendanceLogs order by AttendanceLogId desc')
            .then(function (data, recordsets, returnValue, affected) {
                request1.query('select top 1 EmployeeId from [Employees] order by EmployeeId desc')
                    .then(function (data2, recordsets, returnValue, affected) {
                        thismssql.close();
                        console.log(data);
                        console.log(data2);
                        if (data.recordset[0] && data.recordset[0].AttendanceLogId) {
                            var request2 = pool1.request();
                            var logId = data.recordset[0].AttendanceLogId;
                            var empId = data2.recordset[0].EmployeeId;
                            request2.query('select * from AttendanceLogs where AttendanceLogId > ' + logId).then(function (data, recordsets, returnValue, affected) {
                                request2.query('select * from Employees where EmployeeId > ' + empId).then(function (data2, recordsets, returnValue, affected) {
                                    transferLog(pool1, data.recordsets, data2.recordsets);
                                })
                            }).catch(function (err) {
                                console.log(err);
                                res.send(err);
                            });
                        }
                    })
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
    })

}

function transferLog(pool1, logs, emps) {
    if (logs.length > 0) {
        console.log('adding ' + logs.length + ' logs')
        thispool2.then((pool) => {
            var request = pool.request();
            var sql;
            sql = logs.map(item => `(${item.AttendanceLogId}, '${item.AttendanceDate}',${item.EmployeeId},'${item.InTime}','${item.OutTime}','${item.PunchRecords}',${item.Present},${item.Absent},'${item.Status}')`)
            var finalQuery = "INSERT INTO AttendanceLogs (AttendanceLogId,AttendanceDate,EmployeeId,InTime,OutTime,PunchRecords,Present,Absent,Status) VALUES " + sql
            console.log(finalQuery);
            request.query(finalQuery).then(function (data, recordsets, returnValue, affected) {
                console.log('inserted');
                transferEmployee(pool1, emps);
            }, err => {
                console.log('failed' + err);
                transferEmployee(pool1, emps);
            })
        })
    } else {
        transferEmployee(pool1, emps);
    }
}

function transferEmployee(pool1, emps) {
    if (emps.length > 0) {
        console.log('adding ' + emps.length + 'new employee')
        thispool2.then((pool) => {
            var request = pool.request();
            var sql;
            sql = emps.map(item => `(${item.EmployeeId}, '${item.EmployeeName}','${item.EmployeeCode}')`)
            var finalQuery = "INSERT INTO Employees (EmployeeId,EmployeeName,EmployeeCode) VALUES " + sql
            console.log(finalQuery);
            request.query(finalQuery).then(function (data, recordsets, returnValue, affected) {
                console.log('inserted emps');
                pool1.close();
                console.log(pool1.connected);
                console.log('connection closed');
            }, err => {
                console.log('failed emps' + err);
                pool1.close();
                console.log(pool1.connected);
                console.log('connection closed');
            })
        })
    } else {
        pool1.close();
        console.log(pool1.connected);
        console.log('connection closed');
    }
}

function IncrementLeaveBal() {
    thispool2.then((pool) => {
        var request = pool.request();
        request.query('select * from [Leave_Increment_Monthly]').then(function (data, recordsets, returnValue, affected) {
            var inc = data.recordset[0].Increase_Factor;
            console.log(data.recordset);
            var query = 'update [EmployeeLeaveBalance] set LeaveBalance= LeaveBalance +' + inc;
            request.query(query).then(function (data, recordsets, returnValue, affected) {
                thismssql.close();
                console.log('updated Leave Balance');
            }, err => {
                console.log('failed ' + err);
                thismssql.close();
            })
        })
    })
}

function GenerateReport() {
    thispool2.then((pool) => {
        var request = pool.request();
        request.query('select * from [Leave_Increment_Monthly]').then(function (data, recordsets, returnValue, affected) {
            var inc = data.recordset[0].Increase_Factor;
            var moment = require('moment');
            var now = moment();
            now.month(1);
            now.year(2020);
            let userId = 1273;
            var query = 'select Id from Users where employeecode is not null';
            let year = now.year();
            let month = now.month();
            let emp = '5705';
            request.query(query).then(function (data, recordsets, returnValue, affected) {
                console.log('data len ' + data.recordset.length);
                console.log(year, month, userId)
                request.input('Month', thismssql.Int, month);
                request.input('Year', thismssql.Int, year);
                request.input('UserId', thismssql.Int, userId);
                console.log('sp_GetUserMonthlyReports')
                request.execute('sp_GetUserMonthlyReports').then(function (data, recordsets, returnValue, affected) {
                    console.log(data.recordset);
                    let openLB = data.recordset[0].OpeningLB;
                    var request = pool.request();
                    console.log('sp_GetEmployeeAttendance')
                    request.input("year", thismssql.Int, year);
                    request.input("month", thismssql.Int, month + 1);
                    request.input("employeeCode", thismssql.VarChar(100), emp);
                    request
                        .execute("sp_GetEmployeeAttendance")
                        .then(function (data, recordsets, returnValue, affected) {
                            var sum = 0;
                            var days = 0;
                            var leaves = 0;
                            for (var _t of data.recordset) {
                                if (_t.StatusCode == 'P' || _t.StatusCode == '½P' || _t.StatusCode == 'WFH') {
                                    days++;
                                }else if(_t.StatusCode == 'PL'){
                                    leaves++;
                                }else if(_t.StatusCode == 'A'){
                                    days++; 
                                    leaves++;
                                }
                                console.log(moment.duration(moment(_t.OutTime).diff(moment(_t.InTime))).asMinutes());
                                sum = sum + (moment.duration(moment(_t.OutTime).diff(moment(_t.InTime))).asMinutes());
                            }
                            console.log('working day ', days);
                            var sf=((540 * days) - sum);
                            console.log('extra/shortfall ',sf );
                            console.log('leaves ',leaves );
                            var x=0,y=0;
                            sf=sf+120;
                            if(sf<0){
                                sf=sf*(-1);
                                 x=sf/540;
                                 y=sf%540;
                                if(y>0){
                                    x=x+0.5;
                                }
                            }
                            var total=leaves+x;
                            var closeLB=0,LWP=0;             
                            if(total>=openLB){
                                closeLB=0;
                                LWP=total-openLB;
                            }else{
                                closeLB=openLB-total;
                                LWP=0;
                            }
                            let obj={
                                'month':month,
                                'year':year,
                                'userid':userId,
                                "OpeningLB":openLB,
                                'leavetaken':leaves,
                                'sf':sf,
                                'leaveduetosf':x,
                                "totalleave":total,
                                'lwp':LWP,
                                'closingLB':closeLB
                            }
                            console.log(obj);
                        })
                        .catch(function (err) {
                            console.log(err);
                            res.send(err);
                        });
                }, err => {
                    console.log('failed ' + err);
                    thismssql.close();
                })
            }, err => {
                console.log('failed ' + err);
                thismssql.close();
            })
        })
    })
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
        request.query("SELECT * FROM Users where Isdeleted=0").then(function (data, recordsets, returnValue, affected) {
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
        console.log("=========================");
        console.log(onlyInA);
        console.log("=========================");
        console.log(onlyInB);
        console.log("=========================");
        var common = [];
        for (var x in onlyInB) {
            console.log(onlyInB[x].EmailAddress + ":->");
            for (var y in onlyInA) {
                if (onlyInB[x].EmailAddress == onlyInA[y].EmailAddress) {
                    // console.log( onlyInA[y].EmailAddress +"removed from b");            
                    common.push(x);
                    break;
                }
            }
        }
        for (var i = common.length; i >= 0; i--) {
            onlyInB.splice(common[i], 1);
        }

        if (onlyInA.length) {
            console.log("====Data Updated/Inserted in AD=====");
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
            return other.UserName == current.UserName && other.Designation == current.Designation && other.Department == current.Department && other.DisplayName == current.DisplayName
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

function trans(pool1) {
    var request = pool1.request();
    request.query('select * FROM [APP93].[dbo].[AttendanceLogs] where EmployeeId=7445').then(function (data, recordsets, returnValue, affected) {
        console.log('adding ' + data.recordset.length + ' logs')
        var logs = data.recordset;
        thispool2.then((pool) => {
            var request2 = pool.request();
            var sql;
            var moment = require('moment');
            sql = logs.map(item => `(${item.AttendanceLogId},'`+ moment(item.AttendanceDate).format('YYYY-MM-DD HH:mm:ss')+ `',${item.EmployeeId},'${item.InTime}','${item.OutTime}','${item.PunchRecords}',${item.Present},${item.Absent},'${item.Status}','${item.StatusCode}')`)
            var finalQuery = "INSERT INTO AttendanceLogs (AttendanceLogId,AttendanceDate,EmployeeId,InTime,OutTime,PunchRecords,Present,Absent,Status,StatusCode) VALUES " + sql
            console.log(finalQuery);
            request2.query(finalQuery).then(function (data, recordsets, returnValue, affected) {
                console.log('inserted');
            }, err => {
                console.log('failed' + err);
            })
        })
    }, err => {
        console.log('failed' + err);
        transferEmployee(pool1, emps);
    })
}

module.exports.loadSchema = createSchema;
exports.connectToDatabase2 = connectToDatabase2;
exports.GenerateReport = GenerateReport;
exports.syncData = syncData;