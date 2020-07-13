function createSchema(app, mssql, pool2) {
    var jwtToken = require("./jwt.controller");

    var mailer = require("./mail.controller.js");

    var async = require("async");

    app.get("/api/getattendancestatus", getAttendanceStatus);

    app.get("/api/employee-attendance", getAttendanceForEmployee);

    app.get("/api/employee-attendance-by-id", getAttendanceById);

    app.post("/api/regularize-attendance", regularize);

    app.post("/api/regularize-wfh", regularizewfh);

    app.get('/api/get-regularize-requests', getRegularizeReq);

    app.post("/api/approve-reject-regularize-requests", approveRejectRegularizeReq);

    app.get("/api/checkif-regularize-exists", regularizeExists);

    function getAttendanceById(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log('sp_GetEmployeeAttendanceById');
                    if (isNaN(parseInt(req.query.Id))) {
                        res.status("400");
                        res.send({
                            message: "invalid Id",
                            success: false,
                        });
                        return;
                    }
                    request.input("Id", mssql.Int, req.query.Id);
                    request
                        .execute("sp_GetEmployeeAttendanceById")
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

    function getAttendanceForEmployee(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log('sp_GetEmployeeAttendance');
                    if (new Date(req.query.fromdate) == "Invalid Date" || new Date(req.query.todate) == "Invalid Date"
                        || (req.query.limit != undefined && isNaN(parseInt(req.query.limit)))
                        || (req.query.page != undefined && isNaN(parseInt(req.query.page)))
                        || (req.query.employeeCode != undefined && isNaN(parseInt(req.query.employeeCode)))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
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
                    request.input("AttendanceLogId", mssql.Int, parseInt(req.body.AttendanceLogId));
                    request.input("AttendanceDate", mssql.VarChar(100), req.body.AttendanceDate);
                    request.input("InTime", mssql.VarChar(100), req.body.InTime);
                    request.input("OutTime", mssql.VarChar(100), req.body.OutTime);
                    request.input("EmployeeCode", mssql.VarChar(100), req.body.EmployeeCode);
                    request.input("details", mssql.VarChar(100), req.body.details);
                    request.input("Status", mssql.Int, parseInt(req.body.status));
                    request.input("createdDate", mssql.VarChar(100), req.body.CreatedDate);
                    request
                        .execute("sp_EditEmployeeAttendance")
                        .then(function (data, recordsets, returnValue, affected) {
                            mailer.sendMailAfterRegReqAdded(req.body.AttendanceDate, req.body.EmployeeCode, req.body.AttendanceLogId);
                            mssql.close();
                            res.send({
                                message: "Edit request added successfully!",
                                success: true,
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

    function regularizewfh(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_EditEmployeeAttendance');
                    request.input("AttendanceLogId", mssql.Int, parseInt(req.body.AttendanceLogId));
                    request.input("AttendanceDate", mssql.VarChar(100), req.body.AttendanceDate);
                    request.input("InTime", mssql.VarChar(100), req.body.InTime);
                    request.input("OutTime", mssql.VarChar(100), req.body.OutTime);
                    request.input("EmployeeCode", mssql.VarChar(100), req.body.EmployeeCode);
                    request.input("details", mssql.VarChar(100), req.body.details);
                    request.input("Status", mssql.Int, parseInt(req.body.status));
                    request.input("createdDate", mssql.VarChar(100), req.body.CreatedDate);
                    request
                        .execute("sp_EditEmployeeAttendance")
                        .then(function (data, recordsets, returnValue, affected) {
                            pool2.then(pool => {
                                var request = pool.request();
                                // console.log(req.body);
                                console.log('sp_AddWfh');
                                request.input("userId", mssql.Int, parseInt(req.body.userId));
                                request.input("submitDate", mssql.VarChar(100), req.body.CreatedDate);
                                request.input("details", mssql.VarChar(4000), req.body.details);
                                request.input("startDate", mssql.VarChar(100), req.body.AttendanceDate);
                                request.input("endDate", mssql.VarChar(100), req.body.AttendanceDate);
                                request.input("trackId", mssql.Int, data.recordset[0].trackId);
                                request
                                    .execute("sp_AddWfh")
                                    .then(function (data, recordsets, returnValue, affected) {
                                        mssql.close();
                                        console.log('sp_addTasks')
                                        var someArray = req.body.TaskList
                                        var arrayWithIndx = someArray.map(function (e, i) { return { obj: e, index: i } });
                                        console.log(arrayWithIndx);
                                        async.eachSeries(arrayWithIndx, function (member, callback) {
                                            pool2.then((pool) => {
                                                var request = pool.request();
                                                console.log(member);
                                                request.input('projectId', mssql.Int, member.obj.ProjectId);
                                                request.input('userId', mssql.Int, member.obj.UserId);
                                                request.input("description", mssql.VarChar(4000), member.obj.Description);
                                                request.input("startTime", mssql.VarChar(100), member.obj.StartTime);
                                                request.input("endTime", mssql.VarChar(100), member.obj.EndTime);
                                                request.input('billable', mssql.Int, member.obj.Billable);
                                                request.input('hours', mssql.Int, member.obj.Hours);
                                                request.execute('sp_addTask').then(function (data, recordsets, returnValue, affected) {
                                                    mssql.close();
                                                    console.log("Index ==>", member.index);
                                                    if (member.index == (someArray.length - 1)) {
                                                        console.log("in if");
                                                        res.send({
                                                            message: "Regularize-Wfh added successfully!",
                                                            success: true,
                                                            // response: data.recordset
                                                        });
                                                        // mailer.sendMailAfterWfhAdded(data.recordset[0].Id, req.body.userId);
                                                        mssql.close();
                                                    } else {
                                                        console.log("in else");
                                                        callback();
                                                    }
                                                }).catch(function (err) {
                                                    console.log(err);
                                                    res.send(err);
                                                    callback();
                                                });
                                            });
                                        });
                                    })
                                    .catch(function (err) {
                                        console.log(err);
                                        res.send(err);
                                    });
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

    function getRegularizeReq(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    request.input("userid", mssql.Int, req.query.userId);
                    console.log('[sp_GetRegularizeRequests]');
                    request
                        .execute("sp_GetRegularizeRequests")
                        .then(function (data, recordsets, returnValue, affected) {
                            var resp = data.recordset
                            var i = 0;
                            async.eachSeries(data.recordset, (x, callback) => {
                                if (x.StatusId == 3) {
                                    // console.log(x);
                                    // console.log('sp_getTaskList')
                                    var request = pool.request();
                                    request.input("UserId", mssql.Int, x.Id);
                                    request.input("Date", mssql.DateTime, x.AttendanceDate);
                                    request
                                        .execute("sp_getTaskList")
                                        .then(function (data, recordsets, returnValue, affected) {
                                            console.log(data.recordset)
                                            resp[i].TaskList = data.recordset;
                                            i++;
                                            callback();
                                        })
                                        .catch(function (err) {
                                            console.log(err);
                                            callback();
                                        });
                                } else {
                                    resp[i].TaskList = [];
                                    i++;
                                    callback();
                                }
                            }, () => {
                                mssql.close();
                                res.send({
                                    message: "Data retrieved successfully!",
                                    success: true,
                                    response: resp
                                });
                            })
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
                    if (new Date(req.body.InTime) == "Invalid Date" || new Date(req.body.OutTime) == "Invalid Date"
                        || new Date(req.body.AttendanceDate) == "Invalid Date"
                        || isNaN(parseInt(req.body.AttendanceLogId))
                        || (req.body.Status == undefined) || isNaN(parseInt(req.body.approvedBy))
                        || isNaN(parseInt(req.body.approved)) || isNaN(parseInt(req.body.trackId))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }

                    if (req.body.approved == 0 && req.body.reason == null) {
                        res.send({
                            message: "invalid parameters(Reason is required when regularize rejection.)",
                            success: false,
                        });
                        return;
                    }
                    request.input("trackId", mssql.Int, parseInt(req.body.trackId));
                    request.input("approved", mssql.Int, parseInt(req.body.approved));//
                    request.input("AttendanceLogId", mssql.Int, parseInt(req.body.AttendanceLogId));//
                    request.input("AttendanceDate", mssql.VarChar(100), req.body.AttendanceDate);//
                    request.input("InTime", mssql.VarChar(100), req.body.InTime);//
                    request.input("OutTime", mssql.VarChar(100), req.body.OutTime);//
                    request.input("p", mssql.Float, parseFloat(req.body.Present));//
                    request.input("a", mssql.Float, parseFloat(req.body.Absent));//
                    request.input("punchRecord", mssql.VarChar(100), req.body.punchRecord);//
                    request.input("s", mssql.VarChar(100), req.body.Status);//
                    request.input("approvedBy", mssql.Int, parseInt(req.body.approvedBy));//
                    request.input("reason", mssql.VarChar(4000), req.body.reason)
                    request
                        .execute("sp_ApproveRejectRegularizeRequest")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "request status changed successfully!",
                                success: true,
                            });
                            mailer.sendMailAfterRegReqApprove(req.body.trackId, req.body.AttendanceDate, req.body.AttendanceLogId);
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
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
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
            } else {
                res.status("401");
                res.send(invalidRequestError);
            }
        });
    }

    function regularizeExists(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            if (isNaN(parseInt(req.query.AttendanceLogId))) {
                res.status("400");
                res.send({
                    message: "invalid parameters",
                    success: false,
                });
                return;
            }
            var query = "SELECT * FROM [AttendanceLogsUpdates] where AttendanceLogId =" + req.query.AttendanceLogId
            console.log(query);
            request
                .query(query)
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    if (typeof (data.recordset[0]) != "undefined") {
                        res.send({
                            message: "Record  Exist",
                            success: true,
                            response: { alreadyRegularize: true }
                        });
                    } else {
                        res.send({
                            message: "Record Doesnot Exist",
                            success: false,
                            response: { alreadyRegularize: false }
                        });
                    }
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }
}
module.exports.loadSchema = createSchema;
