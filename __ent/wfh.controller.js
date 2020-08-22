const moment = require("moment-business-days");

function createSchema(app, mssql, pool2) {
    var jwtToken = require("./jwt.controller");

    var mailer = require("./mail.controller.js");

    var async = require("async");

    app.get("/api/getwfhstatus", getWfhStatus);

    app.post("/api/add-wfh", addWfh);

    app.post("/api/update-wfh", updateWfh);

    app.get("/api/employee-wfh", getEmployeeWfh);

    app.get('/api/pending-wfh-approvals', pendingWfhApprovals);

    app.get('/api/pending-wfh-reg-approvals', pendingWfhRegApprovals);

    app.post("/api/approve-reject-wfh", approveRejectWfh);

    app.post("/api/add-wfh-task", addTasks);

    app.post("/api/edit-wfh-task", editTask);

    app.post("/api/delete-wfh-task", deleteTask);

    app.get("/api/get-wfh-tasklist", getTasks);

    app.post("/api/cancel-wfh", cancelWfh)

    app.post("/api/approve-reject-wfh-cancellation", approveRejectWfhCancellation);

    app.post("/api/save-and-submit-tasklist", saveAndSubmitTasklist);

    app.get("/api/employee-wfh-with-tasklist", getEmployeeWfhWithTaksList);

    app.post("/api/regularize-wfh", regularizewfh);

    app.post("/api/edit-wfh-request", editWfhReq);

    app.get('/api/pending-wfh-tasklist-approvals', pendingWfhTasksForApproval);

    app.get('/api/get-wfh-details-and-tasks', getWfhDetailswithTask);

    app.get("/api/getUserTaskDetails", getUserTaskDetails);

    function getWfhStatus(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    console.log('getWfhStatus');
                    var request = pool.request();
                    request
                        .query("SELECT * FROM WfhStatus")
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
                    var request3 = pool.request();
                    request3.input("userId", mssql.Int, parseInt(req.body.userId));
                    request3.input("fromdate", mssql.VarChar(100), req.body.startDate);
                    request3.input("todate", mssql.VarChar(100), req.body.endDate);
                    request3
                        .execute("sp_CheckIfWfhExists")
                        .then(function (data, recordsets, returnValue, affected) {
                            if (typeof (data.recordset[0]) != "undefined") {
                                res.send({
                                    message: "Wfh already exists for the selected date range.",
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
                        })
                        .catch(function (err) {
                            console.log(err);
                            res.send(err);
                        });;
                })

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

    function pendingWfhRegApprovals(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.query);
            console.log('sp_GetPendingWfhRegReq');
            request.input("userId", mssql.Int, req.query.userId);
            request
                .execute("sp_GetPendingWfhRegReq")
                .then(function (data, recordsets, returnValue, affected) {
                    var resp = data.recordset;
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

    function saveAndSubmitTasklist(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('saveAndSubmitTasklist');
                    request.input("wfhId", mssql.Int, parseInt(req.body.wfhId));
                    request.input("userId", mssql.Int, parseInt(req.body.userId));
                    request
                        .execute('sp_saveAndSubmitTasklist')
                        .then(function (data, recordsets, returnValue, affected) {
                            mailer.sendMailAfterRegWfhAdded(req.body.wfhId, req.body.userId);
                            res.send({
                                message: "Task-List submitted successfully!",
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

    function getEmployeeWfhWithTaksList(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log('sp_GetWfh');
                    request.input("userId", mssql.Int, req.query.userId);
                    request.input("year", mssql.Int, req.query.year);
                    request.input("fromdate", mssql.VarChar(100), req.query.fromdate);
                    request.input("todate", mssql.VarChar(100), req.query.todate);
                    request.input("limit", mssql.Int, req.query.limit);
                    request.input("page", mssql.Int, req.query.page);
                    request.input("status", mssql.Int, req.query.status);
                    request
                        .execute("sp_GetWfh")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            var resp = data.recordset
                            var i = 0;
                            async.eachSeries(data.recordset, (x, callback) => {
                                if (x.StartDate) {
                                    // console.log(x);
                                    // console.log('sp_getTaskList')
                                    var request = pool.request();
                                    request.input("UserId", mssql.Int, x.Userid);
                                    request.input("Date", mssql.DateTime, x.StartDate);
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


    function regularizewfh(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    if (req.body.TaskList.length == 0) {
                        res.send({
                            message: "Atleast one task is required",
                            success: false,
                            // response: data.recordset
                        });
                        return;
                    }
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
                                request.input("InTime", mssql.VarChar(100), req.body.InTime);
                                request.input("OutTime", mssql.VarChar(100), req.body.OutTime);
                                request
                                    .execute("sp_AddWfh")
                                    .then(function (data, recordsets, returnValue, affected) {
                                        var wfh = data.recordset[0].Id;
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
                                                            message: "Task-List saved successfully!",
                                                            success: true,
                                                            // response: data.recordset
                                                        });
                                                        if (req.body.confirmed == 1) {
                                                            var request = pool.request();
                                                            request.input("wfhId", mssql.Int, wfh);
                                                            request.input("userId", mssql.Int, parseInt(req.body.userId));
                                                            request
                                                                .execute('sp_saveAndSubmitTasklist')
                                                                .then(function (data, recordsets, returnValue, affected) {
                                                                    mailer.sendMailAfterRegWfhAdded(wfh, req.body.userId);
                                                                })
                                                                .catch(function (err) {
                                                                    console.log(err);
                                                                    res.send(err);
                                                                });
                                                        }
                                                        // mailer.sendMailAfterRegWfhAdded(wfh, req.body.userId);
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


    function editWfhReq(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                console.log('sp_deleteOldTasks')
                var someArray = req.body.TaskList
                var arrayWithIndx = someArray.map(function (e, i) { return { obj: e, index: i } });
                console.log(req.body);
                pool2.then((pool) => {
                    var request = pool.request();
                    pool2.then((pool) => {
                        var request = pool.request();
                        request.input("InTime", mssql.VarChar(2000), req.body.InTime);
                        request.input("OutTime", mssql.VarChar(2000), req.body.OutTime);
                        request.input("UpdateDate", mssql.VarChar(2000), req.body.UpdateDate);
                        request.input("wfhId", mssql.Int, parseInt(req.body.wfhId));
                        request.execute('[sp_UpdateWfh]').then(function (data, recordsets, returnValue, affected) {
                            console.log('updated wfh');
                        }).catch(function (err) {
                            console.log(err);

                        });
                    })
                    request.input('userId', mssql.Int, arrayWithIndx[0].UserId);
                    request.input("startTime", mssql.VarChar(100), arrayWithIndx[0].StartTime);
                    request.execute('[sp_deleteOldTasks]').then(function (data, recordsets, returnValue, affected) {
                        console.log('sp_addTasks')
                        async.eachSeries(arrayWithIndx, function (member, callback) {
                            pool2.then((pool) => {
                                var request = pool.request();
                                // console.log(member);
                                request.input('id', mssql.Int, member.obj.Id);
                                request.input('projectId', mssql.Int, member.obj.ProjectId);
                                request.input('userId', mssql.Int, member.obj.UserId);
                                request.input("description", mssql.VarChar(4000), member.obj.Description);
                                request.input("startTime", mssql.VarChar(100), member.obj.StartTime);
                                request.input("endTime", mssql.VarChar(100), member.obj.EndTime);
                                request.input('billable', mssql.Int, member.obj.Billable);
                                request.input('hours', mssql.Int, member.obj.Hours);
                                request.execute('sp_addTask').then(function (data, recordsets, returnValue, affected) {
                                    mssql.close();
                                    // console.log("Index ==>", member.index);
                                    if (member.index == (someArray.length - 1)) {
                                        // console.log("in if");
                                        res.send({
                                            message: "Task-List edited and saved successfully!",
                                            success: true,
                                            // response: data.recordset
                                        });
                                        mssql.close();
                                    } else {
                                        console.log("in else");
                                        callback();
                                    }
                                }).catch(function (err) {
                                    console.log(err);
                                    callback();
                                });
                            });
                        });
                    })
                }).catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
            } else {
                res.status("401");
                res.send(invalidRequestError);
            }
        });
    }

    function pendingWfhTasksForApproval(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log('sp_GetPendingWfhForApproval');
                    request.input("userId", mssql.Int, req.query.userId);
                    request
                        .execute("sp_GetPendingWfhForApproval")
                        .then(function (data, recordsets, returnValue, affected) {
                            var resp = data.recordset;
                            var i = 0;
                            async.eachSeries(data.recordset, (x, callback) => {
                                if (x.StartDate) {
                                    // console.log(x);
                                    // console.log('sp_getTaskList')
                                    var request = pool.request();
                                    request.input("UserId", mssql.Int, x.Id);
                                    request.input("Date", mssql.DateTime, x.StartDate);
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


    function getWfhDetailswithTask(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    request.input("wfhId", mssql.Int, req.query.wfhId);
                    request.execute("[sp_GetWfhDetailsByWfhId]").then(function (data) {
                        var request = pool.request();
                        request.input("UserId", mssql.Int, data.recordset[0].UserId);
                        request.input("Date", mssql.DateTime, data.recordset[0].StartDate);
                        request
                            .execute("sp_getTaskList")
                            .then(function (data2, recordsets, returnValue, affected) {
                                mssql.close();
                                data.recordset[0].TaskList = data2.recordset;
                                res.send({
                                    message: "Data retrieved successfully!",
                                    success: true,
                                    response: data.recordset[0]
                                });
                            })
                            .catch(function (err) {
                                res.send(err);
                                console.log(err);
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


    function getUserTaskDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    console.log('getUserTaskDetails');
                    var request = pool.request();
                    var obj = {};
                    request.input("userId", mssql.Int, req.query.userId);
                    request.input("startDate", mssql.VarChar(200), req.query.startDate);
                    request.input("endDate", mssql.VarChar(200), req.query.endDate);
                    request
                        .execute("getUserTaskList")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            data.recordset.forEach(x => {
                                let date = moment(x.StartTime).format('YYYY-MM-DD');
                                if (obj[date]) {
                                    obj[date].push(x);
                                } else {
                                    obj[date] = [x];
                                }
                            })
                            var resp = getDates(req.query.startDate, req.query.endDate, obj)
                            res.send({
                                message: "Data retrieved successfully!",
                                success: true,
                                response: resp
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

    function getDates(startDate, stopDate, obj) {
        var dateArray = [];
        var currentDate = moment(startDate).format('YYYY-MM-DD');
        var stopDate = moment(stopDate).format('YYYY-MM-DD');
        console.log(currentDate, stopDate);
        while (currentDate <= stopDate) {
            if (!obj[currentDate]) {
                obj[currentDate] = []
            }
            currentDate = moment(currentDate).add(1, 'days').format('YYYY-MM-DD');
        }
        var arrr = [];
        Object.keys(obj).sort().forEach(function (key) {
            arrr.push({
                date: key,
                task: obj[key]
            })
        });
        return arrr;
    }
}
module.exports.loadSchema = createSchema;
