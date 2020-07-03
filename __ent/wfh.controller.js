function createSchema(app, mssql, pool2) {
    var jwtToken = require("./jwt.controller");

    var mailer = require("./mail.controller.js");

    var async = require("async");

    app.post("/api/add-wfh", addWfh);

    app.post("/api/update-wfh", updateWfh);

    app.get("/api/employee-wfh", getEmployeeWfh);

    app.get('/api/pending-wfh-approvals', pendingWfhApprovals);

    app.post("/api/approve-reject-wfh", approveRejectWfh);

    app.post("/api/add-wfh-task", addTasks);

    app.post("/api/edit-wfh-task", editTask);

    app.post("/api/delete-wfh-task", deleteTask);

    app.get("/api/get-wfh-tasklist", getTasks);

    app.post("/api/cancel-wfh", cancelWfh)

    app.post("/api/approve-reject-wfh-cancellation", approveRejectWfhCancellation);


    function addWfh(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_AddWfh');
                    if (isNaN(parseInt(req.body.userId)) || req.body.details == undefined
                        || new Date(req.body.submitDate) == "Invalid Date" || new Date(req.body.startDate) == "Invalid Date" || new Date(req.body.endDate) == "Invalid Date") {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    request.input("userId", mssql.Int, parseInt(req.body.userId));
                    request.input("submitDate", mssql.VarChar(100), req.body.submitDate);
                    request.input("details", mssql.VarChar(4000), req.body.details);
                    request.input("startDate", mssql.VarChar(100), req.body.startDate);
                    request.input("endDate", mssql.VarChar(100), req.body.endDate);
                    request
                        .execute("sp_AddWfh")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "Wfh added successfully!",
                                success: true,
                                response: data.recordset
                            });
                            mailer.sendMailAfterWfhAdded(data.recordset[0].Id, req.body.userId);
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

    function getEmployeeWfh(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    if ((req.query.limit != undefined && isNaN(parseInt(req.query.limit)))
                        || (req.query.page != undefined && isNaN(parseInt(req.query.page)))
                        || (req.query.userId != undefined && isNaN(parseInt(req.query.userId)))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    var request = pool.request();
                    console.log(req.query);
                    console.log('sp_GetEmployeeWfh');
                    request.input("userId", mssql.Int, req.query.userId);
                    request.input("year", mssql.Int, req.query.year);
                    request.input("fromdate", mssql.VarChar(100), req.query.fromdate);
                    request.input("todate", mssql.VarChar(100), req.query.todate);
                    request.input("limit", mssql.Int, req.query.limit);
                    request.input("page", mssql.Int, req.query.page);
                    request.input("status", mssql.Int, req.query.status);

                    request
                        .execute("sp_GetEmployeeWfh")
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

    function updateWfh(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_UpdateWfh');
                    if ((req.body.UpdateDate != undefined && new Date(req.body.UpdateDate) == "Invalid Date")
                        || isNaN(parseInt(req.body.wfhId))
                        || (parseInt(req.body.userId))
                    ) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    request.input("userId", mssql.Int, parseInt(req.body.userId));
                    request.input("submitDate", mssql.VarChar(100), req.body.submitDate);
                    request.input("details", mssql.VarChar(4000), req.body.details);
                    request.input("startDate", mssql.VarChar(100), req.body.startDate);
                    request.input("endDate", mssql.VarChar(100), req.body.endDate);
                    request.input("wfhId", mssql.Int, parseInt(req.body.wfhId));
                    request.input("UpdateDate", mssql.VarChar(100), req.body.UpdateDate);
                    request
                        .execute("sp_UpdateWfh")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "Wfh Update successfully!",
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

    function pendingWfhApprovals(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.query);
            console.log('sp_GetPendingWfhApprovals');
            if (isNaN(parseInt(req.query.userId))) {
                res.status("400");
                res.send({
                    message: "invalid parameters",
                    success: false,
                });
                return;
            }
            request.input("userId", mssql.Int, req.query.userId);
            request
                .execute("sp_GetPendingWfhApprovals")
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

    function approveRejectWfh(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.body);
            console.log('sp_ApproveRejectWfh')
            var status = req.body.status;
            var leaveId = req.body.leaveId;
            if ((req.body.userId == undefined || isNaN(parseInt(req.body.userId))) ||
                (req.body.wfhId == undefined || isNaN(parseInt(req.body.wfhId))) ||
                (req.body.status == undefined || isNaN(parseInt(req.body.status)))) {
                res.status("400");
                res.send({
                    message: "invalid parameters",
                    success: false,
                });
                return;
            }
            request.input("userId", mssql.Int, parseInt(req.body.userId));
            request.input("wfhId", mssql.Int, parseInt(req.body.wfhId));
            request.input("status", mssql.Int, parseInt(req.body.status));
            request.input("reason", mssql.VarChar(4000), req.body.reason)
            request
                .execute("sp_ApproveRejectWfh")
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    console.log(data);
                    if (status == 2) {
                        rejectWfh(req, res);
                    } else {
                        updateStatusofWfh(req, res, data.recordset);
                    }
                    mailer.sendMailAfterApproveWfh(req.body.userId, req.body.wfhId);
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }

    function rejectWfh(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.body);
            console.log('reject');
            var query = "update EmployeeWfh set status = 2 where Id = " + req.body.wfhId;
            request.input("wfhId", mssql.Int, req.body.wfhId);
            request
                .execute("sp_RejectWfh")
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    res.send({
                        message: "Wfh Status Updated successfully!",
                        success: true,
                    });
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }

    function updateStatusofWfh(req, res, records) {
        pool2.then(pool => {
            var request = pool.request();
            var query;
            console.log(req.body);
            if (records.length == 1) {
                query = "update EmployeeWfh set status = 1 where Id = " + req.body.wfhId;
                console.log(' accepted')
                request
                    .query(query)
                    .then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log(data);
                        res.send({
                            message: "Wfh Status Updated successfully!",
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
                    console.log('group accept')
                    query = "update EmployeeWfh set status = 1 where Id = " + req.body.leaveId;
                    request
                        .query(query)
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            console.log(data);
                            res.send({
                                message: "Wfh Status Updated successfully!",
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
                        message: "Wfh Status Updated successfully!",
                        success: true,
                    });
                }
            }

        });
    }

    function addTasks(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                console.log(req.body.TaskList);
                console.log('sp_addTasks')
                var someArray = req.body.TaskList
                var arrayWithIndx = someArray.map(function (e, i) { return { obj: e, index: i } });
                console.log(arrayWithIndx);
                async.eachSeries(arrayWithIndx, function (member, callback) {
                    pool2.then((pool) => {
                        if ((isNaN(parseInt(member.obj.UserId))) ||
                            new Date(member.obj.StartTime) == "Invalid Date" ||
                            new Date(member.obj.EndTime) == "Invalid Date" ||
                            (isNaN(parseInt(member.obj.Hours))) ||
                            (isNaN(parseInt(member.obj.Billable)))
                        ) {
                            res.status("400");
                            res.send({
                                message: "invalid parameters",
                                success: false,
                            });
                            return;
                        }
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
                                res.send({ message: "TaskList added successfully!" });
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
            }
        });
    }

    function addSingleTask(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_addTask')
                    request.input('projectId', mssql.Int, req.body.ProjectId);
                    request.input('userId', mssql.Int, req.body.UserId);
                    request.input("description", mssql.VarChar(4000), req.body.Description);
                    request.input("startTime", mssql.VarChar(100), req.body.StartTime);
                    request.input("endTime", mssql.VarChar(100), req.body.EndTime);
                    request.input('billable', mssql.Int, req.body.Billable);
                    request.execute('sp_addTask').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({
                            message: "Task added successfully!",
                            success: true,
                            response: data.recordset
                        });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                        callback();
                    });
                });

            }
        });
    }

    function deleteTask(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_deleteTask')
                    request.input('Id', mssql.Int, req.body.Id);
                    request.execute('sp_deleteTask').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Task delete successfully!" });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                        callback();
                    });
                });

            }
        });
    }

    function editTask(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_editTask')
                    request.input('Id', mssql.Int, req.body.Id);
                    request.input('projectId', mssql.Int, req.body.ProjectId);
                    request.input("description", mssql.VarChar(4000), req.body.Description);
                    request.input("startTime", mssql.VarChar(100), req.body.StartTime);
                    request.input("endTime", mssql.VarChar(100), req.body.EndTime);
                    request.input('billable', mssql.Int, req.body.Billable);
                    request.execute('sp_editTask').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({
                            message: "Task edit successfully!",
                            success: true,
                            response: data.recordset
                        });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                        callback();
                    });
                });

            }
        });
    }

    function getTasks(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_getTaskList');
                    if (new Date(req.query.Date) == "Invalid Date" ||
                        (isNaN(parseInt(req.query.UserId)))
                    ) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    request.input('UserId', mssql.Int, req.query.UserId);
                    request.input("Date", mssql.VarChar(100), req.query.Date);
                    request.execute('sp_getTaskList').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({
                            message: "Task List Retrieved successfully!",
                            success: true,
                            response: data.recordset
                        });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                        callback();
                    });
                });

            }
        });
    }


    function cancelWfh(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_cancelWfh');
                    if ((req.body.userId == undefined || isNaN(parseInt(req.body.userId))) ||
                        (req.body.wfhId == undefined || isNaN(parseInt(req.body.wfhId))) ||
                        (req.body.reason == undefined) ||
                        (new Date(req.body.submitDate) == "Invalid Date")) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    request.input("userId", mssql.Int, parseInt(req.body.userId));
                    request.input("wfhId", mssql.Int, parseInt(req.body.wfhId));
                    request.input("submitDate", mssql.VarChar(4000), req.body.submitDate)
                    request.input("reason", mssql.VarChar(4000), req.body.reason)
                    request
                        .execute('sp_cancelWfh')
                        .then(function (data, recordsets, returnValue, affected) {
                            res.send({
                                message: "Cancellation request sent successfully!",
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


    function approveRejectWfhCancellation(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.body);
            console.log('sp_ApproveRejectWfh');
            if ((req.body.userId == undefined || isNaN(parseInt(req.body.userId))) ||
                (req.body.wfhId == undefined || isNaN(parseInt(req.body.wfhId))) ||
                (req.body.status == undefined || isNaN(parseInt(req.body.status)))) {
                res.status("400");
                res.send({
                    message: "invalid parameters",
                    success: false,
                });
                return;
            }
            var status = req.body.status;
            var wfhId = req.body.wfhId;
            request.input("userId", mssql.Int, parseInt(req.body.userId));
            request.input("wfhId", mssql.Int, parseInt(req.body.wfhId));
            request.input("status", mssql.Int, parseInt(req.body.status));
            request.input("reason", mssql.VarChar(4000), req.body.reason)
            request
                .execute("sp_ApproveRejectWfh")
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    console.log(data);
                    if (status == 2) {
                        var request = pool.request();
                        var query = "update EmployeeWfh set CancelReason=null,CancelDate=null where Id =" + wfhId;
                        request
                            .query(query)
                            .then(function (data, recordsets, returnValue, affected) {
                                res.send({
                                    message: "WFh Cancellation Rejected successfully!",
                                    success: true,
                                });
                            }).catch(function (err) {
                                console.log(err);
                                res.send(err);
                            });
                    } else {
                        updateStatusofWfhCancellation(req, res, data.recordset);
                    }
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }


    function updateStatusofWfhCancellation(req, res, records) {
        pool2.then(pool => {
            var request = pool.request();
            var query;
            console.log(req.body);
            if (records.length == 1) {
                query = "select * from EmployeeWfh where Id = " + req.body.wfhId;
                console.log('single  Cancellation accepted')
                request
                    .query(query)
                    .then(function (data, recordsets, returnValue, affected) {
                        var LeaveDetails = data.recordset[0];
                        var request = pool.request();
                        query = "update EmployeeWfh set status = 4 where Id = " + req.body.wfhId;
                        request
                            .query(query)
                            .then(function (data, recordsets, returnValue, affected) {
                                mssql.close();
                                // if (LeaveDetails.Status == 1) {
                                //     restoreLeaves(LeaveDetails.Id, LeaveDetails.Userid);
                                // }
                                console.log(data);
                                res.send({
                                    message: "Wfh Cancellation Accepted successfully!",
                                    success: true,
                                });
                            })
                            .catch(function (err) {
                                console.log(err);
                                res.send(err);
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
                    console.log('group Cancellation accept')
                    query = "update EmployeeWfh set status = 1 where status=3 and Id = " + req.body.wfhId;
                    request
                        .query(query)
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            console.log(data);
                            res.send({
                                message: "Wfh Cancellation Accepted successfully!",
                                success: true,
                            });
                        })
                        .catch(function (err) {
                            console.log(err);
                            res.send(err);
                        });
                } else {
                    console.log('group Cancellation pending')
                    res.send({
                        message: "Wfh Cancellation Accepted successfully!",
                        success: true,
                    });
                }
            }

        });
    }

}
module.exports.loadSchema = createSchema;
