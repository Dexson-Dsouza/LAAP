function createSchema(app, mssql, pool2) {
    var jwtToken = require("./jwt.controller");

    //  var mailer = require("./mail.controller.js");

    var async = require("async");

    app.get("/api/getleavestatus", getLeaveStatus);

    app.get("/api/getleavecategory", getLeaveCategory);

    app.post("/api/add-leave", addLeave);

    app.post("/api/update-leave", updateLeave);

    app.get("/api/employee-leaves", getLeavesForEmployee);

    app.get("/api/employee-on-leave-list", getEmployeeOnLeave);

    app.get('/api/pending-leave-approvals', pendingLeaveApprovals);

    app.post("/api/approve-reject-leave", approveRejectLeave);


    function getLeaveStatus(req, res) {
        pool2.then(pool => {
            console.log('LeaveStatus');
            var request = pool.request();
            request
                .query("SELECT * FROM LeaveStatus")
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

    function addLeave(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_AddLeave');
                    request.input("userId", mssql.Int, parseInt(req.body.userId));
                    request.input("submitDate", mssql.VarChar(100), req.body.submitDate);
                    request.input("details", mssql.VarChar(4000), req.body.details);
                    request.input("leaveCategory", mssql.Int, parseInt(req.body.leaveCategory));
                    request.input("startDate", mssql.VarChar(100), req.body.startDate);
                    request.input("endDate", mssql.VarChar(100), req.body.endDate);
                    request.input("halfDay", mssql.Int, parseInt(req.body.halfDay));
                    var oneDay = 24 * 60 * 60 * 1000;
                    var startDate = new Date(req.body.startDate);
                    var endDate = new Date(req.body.endDate);
                    var diffDays = Math.round(Math.abs((startDate.getTime() - endDate.getTime()) / (oneDay)));
                    console.log(diffDays);
                    request
                        .execute("sp_AddLeave")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "Leave added successfully!",
                                success: true,
                                response: data.recordset
                            });
                            if (diffDays > 2) {
                                req.body.leaveId = data.recordset[0].Id;
                                // addHodApproval(req, res);
                            }
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

    function addHodApproval(req, res) {
        pool2.then(pool => {
            var query = "insert into leaveDetails ([LeaveId],[ApproverId],Status)values(" +
                "(select top 1 e.Id  from EmployeeLeave e  where userid=" + parseInt(req.body.userId) + " order by id desc),"
            "select HOD from Department where id =(select DeptId from EmployeeDeptMapper where UserId=" + parseInt(req.body.userId) + "),"
                + "3)";
            request
                .query(query)
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    console.log('hod added')
                })
        })
    }

    function updateLeave(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_UpdateLeave');
                    request.input("userId", mssql.Int, parseInt(req.body.userId));
                    request.input("submitDate", mssql.VarChar(100), req.body.submitDate);
                    request.input("details", mssql.VarChar(4000), req.body.details);
                    request.input("leaveCategory", mssql.Int, parseInt(req.body.leaveCategory));
                    request.input("startDate", mssql.VarChar(100), req.body.startDate);
                    request.input("endDate", mssql.VarChar(100), req.body.endDate);
                    request.input("leaveId", mssql.Int, parseInt(req.body.leaveId));
                    request.input("UpdateDate", mssql.VarChar(100), req.body.UpdateDate);
                    request.input("halfDay", mssql.Int, parseInt(req.body.halfDay));
                    request
                        .execute("sp_UpdateLeave")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "Leave Update successfully!",
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

    function getLeavesForEmployee(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log('sp_GetEmployeeLeaves');
                    request.input("userId", mssql.Int, req.query.userId);
                    request.input("year", mssql.Int, req.query.year);
                    request.input("fromdate", mssql.VarChar(100), req.query.fromdate);
                    request.input("todate", mssql.VarChar(100), req.query.todate);
                    request.input("limit", mssql.Int, req.query.limit);
                    request.input("page", mssql.Int, req.query.page);
                    if (req.query.category != '') {
                        request.input("category", mssql.Int, req.query.category);
                    }
                    if (req.query.status != '') {
                        request.input("status", mssql.Int, req.query.status);
                    }
                    request.input("halfDay", mssql.Int, req.query.halfDay);
                    request
                        .execute("sp_GetEmployeeLeaves")
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

    function getLeaveCategory(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log("SELECT * FROM LeaveCategory");
            request
                .query("SELECT * FROM LeaveCategory")
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

    function pendingLeaveApprovals(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.query);
            console.log('sp_GetPendingLeaveApprovals')
            request.input("userId", mssql.Int, req.query.userId);
            request
                .execute("sp_GetPendingLeaveApprovals")
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

    function approveRejectLeave(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.body);
            console.log('sp_ApproveRejectLeave')
            var status = req.body.status;
            var leaveId = req.body.leaveId;
            request.input("userId", mssql.Int, parseInt(req.body.userId));
            request.input("leaveId", mssql.Int, parseInt(req.body.leaveId));
            request.input("status", mssql.Int, parseInt(req.body.status));

            request
                .execute("sp_ApproveRejectLeave")
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    console.log(data);
                    if (status == 2) {
                        rejectLeave(req, res);
                    } else {
                        updateStatusofLeave(req, res, data.recordset);
                    }
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }

    function rejectLeave(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.body);
            var query = "update EmployeeLeave set status = 2 where Id = " + req.body.leaveId;
            request
                .query(query)
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    res.send({
                        message: "Leave Status Updated successfully!",
                        success: true,
                    });
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }

    function updateStatusofLeave(req, res, records) {
        pool2.then(pool => {
            var request = pool.request();
            var query;
            console.log(req.body);
            if (records.length == 1) {
                query = "update EmployeeLeave set status = 1 where Id = " + req.body.leaveId;
                //console.log('single accepted')
                request
                    .query(query)
                    .then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        deductLeaveBalance(req.body.leaveId, req.body.userId);
                        console.log(data);
                        res.send({
                            message: "Leave Status Updated successfully!",
                            success: true,
                        });
                    })
                    .catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
            } else {
                let __t = true;
                records.forEach(record => {
                    if (record.Status != 1) {
                        __t = false;
                        return;
                    }
                });
                if (__t) {
                    //  console.log('group accept')
                    query = "update EmployeeLeave set status = 1 where Id = " + req.body.leaveId;
                    request
                        .query(query)
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            console.log(data);
                            res.send({
                                message: "Leave Status Updated successfully!",
                                success: true,
                            });
                        })
                        .catch(function (err) {
                            console.log(err);
                            res.send(err);
                        });
                } else {
                    console.log('group pending')
                    res.send({
                        message: "Leave Status Updated successfully!",
                        success: true,
                    });
                }
            }

        });
    }

    function deductLeaveBalance(leaveId, userId) {
        pool2.then(pool => {
            request.input("leaveId", mssql.Int, leaveId);
            request.input("userId", mssql.Int, userId);
            request
                .execute("sp_deductLeaveBalance")
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
        })
    }

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

    function getEmployeeOnLeave(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    var query =
                        'select e.*,u.id as userid,u.DisplayName,UserFile.* from EmployeeLeave e left join users u on e.userid=u.id LEFT JOIN UserFile '
                        + 'ON U.Photo = UserFile.FileId where StartDate<=' + req.query.date + ' and EndDate>=' + req.query.date;
                    console.log(req.query);
                    console.log(query);
                    request
                        .query(query)
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
}
module.exports.loadSchema = createSchema;
