function createSchema(app, mssql, pool2) {
    var jwtToken = require("./jwt.controller");

    //  var mailer = require("./mail.controller.js");

    var async = require("async");

    app.get("/api/getattendancestatus", getAttendanceStatus);

    app.get("/api/employee-attendance", getAttendanceForEmployee);

    app.post("/api/regularize-attendance", regularize);

    app.get('/api/get-regularize-requests', getRegularizeReq);

    app.post("/api/approve-reject-regularize-requests", approveRejectRegularizeReq);


    function getAttendanceForEmployee(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log('sp_GetEmployeeAttendance')
                    request.input("fromdate", mssql.VarChar(100), req.query.fromdate);
                    request.input("todate", mssql.VarChar(100), req.query.todate);
                    request.input("limit", mssql.Int, req.query.limit);
                    request.input("page", mssql.Int, req.query.page);
                    request.input("employeeCode", mssql.VarChar(100), req.query.employeeCode);
                    request
                        .execute("sp_GetEmployeeAttendance")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "Data retrieved successfully!",
                                success: true,
                                response: data.recordset
                            });
                        })
                        .catch(function (err) {
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

    function regularize(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_EditEmployeeAttendance');
                    if (new Date(req.body.InTime) == "Invalid Date" || new Date(req.body.OutTime) == "Invalid Date" || new Date(req.body.AttendanceDate) == "Invalid Date") {
                        res.send({
                            message: "invalid date",
                            success: false,
                        });
                        return;
                    }
                    request.input("AttendanceLogId", mssql.Int, parseInt(req.body.AttendanceLogId));
                    request.input("AttendanceDate", mssql.VarChar(100), req.body.AttendanceDate);
                    request.input("InTime", mssql.VarChar(100), req.body.InTime);
                    request.input("OutTime", mssql.VarChar(100), req.body.OutTime);
                    request.input("EmployeeCode", mssql.VarChar(100), req.body.EmployeeCode);
                    request.input("details", mssql.VarChar(100), req.body.details);
                    request.input("Status", mssql.Int, parseInt(req.body.status));

                    request
                        .execute("sp_EditEmployeeAttendance")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "Edit request added successfully!",
                                success: true,
                            });
                            // mailer.sendMailAfterJobAdd(req.body.postedBy, data.recordset[0].Id);
                        })
                        .catch(function (err) {
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

    function getRegularizeReq(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('[sp_GetRegularizeRequests]');
                    request
                        .execute("sp_GetRegularizeRequests")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "Data retrieved successfully!",
                                success: true,
                                response: data.recordset
                            });
                            // mailer.sendMailAfterJobAdd(req.body.postedBy, data.recordset[0].Id);
                        })
                        .catch(function (err) {
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

    function approveRejectRegularizeReq(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('[sp_ApproveRejectRegularizeRequest]');
                    request.input("trackId", mssql.Int, parseInt(req.body.trackId));
                    request.input("approved", mssql.Int, parseInt(req.body.approved));
                    request.input("AttendanceLogId", mssql.Int, parseInt(req.body.AttendanceLogId));
                    request.input("AttendanceDate", mssql.VarChar(100), req.body.AttendanceDate);
                    request.input("InTime", mssql.VarChar(100), req.body.InTime);
                    request.input("OutTime", mssql.VarChar(100), req.body.OutTime);
                    request.input("p", mssql.Float, parseFloat(req.body.Present));
                    request.input("a", mssql.Float, parseFloat(req.body.Absent));
                    request.input("punchRecord", mssql.VarChar(100), req.body.punchRecord);
                    request.input("s", mssql.VarChar(100), req.body.Status);

                    request
                        .execute("sp_ApproveRejectRegularizeRequest")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "request status changed successfully!",
                                success: true,
                            });
                            // mailer.sendMailAfterJobAdd(req.body.postedBy, data.recordset[0].Id);
                        })
                        .catch(function (err) {
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

    function getAttendanceStatus(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log("SELECT * FROM AttendanceStatus");
            request
                .query("SELECT * FROM AttendanceStatus")
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    res.send({
                        message: "Data retrieved successfully!",
                        success: true,
                        response: data.recordset
                    });
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }

}
module.exports.loadSchema = createSchema;
