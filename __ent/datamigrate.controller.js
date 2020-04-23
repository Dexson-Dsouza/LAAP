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
}

function connectToDatabase2() {
    var pooll;
    // var config = {
    //     user: "App",
    //     password: "Etime123#",
    //     server: "192.168.1.223",
    //     port: 1433,
    //     database: "APP93",
    //     options: {
    //         encrypt: false
    //     },
    //     connectionTimeout: 300000,
    //     requestTimeout: 300000,
    //     pool: {
    //         idleTimeoutMillis: 300000,
    //         max: 100
    //     }
    // };
    var config = {
        user: "sa",
        password: "Infinite123#",
        server: "INMDCS43873\\MSSQLSERVER14",
        port: 1433,
        database: "PowerExpense",
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
            sql = logs.map(item => `(${item.AttendanceLogId}, '${item.AttendanceDate}',${item.EmployeeId},' ${item.InTime}',' ${item.OutTime}',' ${item.PunchRecords}',${item.Present},${item.Absent},' ${item.Status}')`)
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
module.exports.loadSchema = createSchema;
exports.connectToDatabase2 = connectToDatabase2;