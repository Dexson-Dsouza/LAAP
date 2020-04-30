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

    app.post("/api/disapprove-leave", disapprove)

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
                                addHodApproval(req, res);
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
            var request = pool.request();
            var query = "select UserId from [EmployeeDeptMapper] where Deptid =(select DeptId from EmployeeDeptMapper where UserId=" + req.body.userId + ") and Roleid=1"
            request
                .query(query)
                .then(function (data, recordsets, returnValue, affected) {
                    var request = pool.request();
                    var query = "  select approverid as UserId from [LeaveDetails] where Leaveid =(select top 1 e.Id  from EmployeeLeave e  where userid="
                        + req.body.userId + " order by id desc)";
                    request
                        .query(query)
                        .then(function (data2, recordsets, returnValue, affected) {
                            var mang = [];
                            for(var x of data2.recordset){
                                mang.push(x.UserId);
                            }
                            var arr = [];
                            console.log('manager list = ')
                            console.log(mang);
                            console.log('hod list = ')
                            console.log(data.recordset);
                            for (var d of data.recordset) {
                                if (d.UserId != req.body.userId && !mang.includes(d.UserId)) {
                                    arr.push(d);
                                }
                            }
                            console.log('fin list = ')
                            console.log(arr);

                            async.eachSeries(arr, function (__t, callback) {
                                var request = pool.request();
                                var query = "insert into [LeaveDetails] values("
                                    + "(select top 1 e.Id  from EmployeeLeave e  where userid=" + parseInt(req.body.userId) + " order by id desc),"
                                    + __t.UserId + ",3)";
                                request
                                    .query(query)
                                    .then(function (data, recordsets, returnValue, affected) {
                                        callback();
                                    }).catch(function (err) {
                                        console.log(err);
                                        callback();
                                    });
                            }, () => {
                                mssql.close();
                                console.log('hod approval added')
                            })
                        })
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
            console.log('reject');
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
                query = "update EmployeeLeave set status = 1 where status=3 and Id = " + req.body.leaveId;
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
                    query = "update EmployeeLeave set status = 1 where status=3 and Id = " + req.body.leaveId;
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
            var request = pool.request();
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


    function disapprove(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.body);
            console.log('disapproveLeave');
            var query = "select * from EmployeeLeave where Id = " + req.body.leaveId;
            request
                .query(query)
                .then(function (data, recordsets, returnValue, affected) {
                    var leave = data.recordset[0];
                    var request = pool.request();
                    var query = "update EmployeeLeave set status = 2 where Id = " + req.body.leaveId;
                    console.log(data.recordset[0]);
                    request
                        .query(query)
                        .then(function (data, recordsets, returnValue, affected) {
                            if (leave.Status == 1) {
                                restoreLeaves(req.body.leaveId, req.body.userId);;
                            }
                            mssql.close();
                            res.send({
                                message: "Leave Status Updated successfully!",
                                success: true,
                            });
                        }).catch(function (err) {
                            console.log(err);
                            res.send(err);
                        });;
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }

    function restoreLeaves(leaveId, userId) {
        pool2.then(pool => {
            console.log("sp_restoreLeaveBalance");
            console.log(leaveId, userId)
            var request = pool.request();
            request.input("leaveId", mssql.Int, leaveId);
            request.input("userId", mssql.Int, userId);
            request
                .execute("sp_restoreLeaveBalance")
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    console.log('done');
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        })
    }

}
module.exports.loadSchema = createSchema;
