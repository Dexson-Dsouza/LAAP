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


    function addWfh(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_AddWfh');
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
                            // mailer.sendMailAfterWfhAdded(data.recordset[0].Id, req.body.userId);
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
            console.log('sp_GetPendingWfhApprovals')
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
            request
                .query(query)
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    res.send({
                        message: "Wfh Status Updated successfully!",
                        success: true,
                    });
                    // mailer.sendMailAfterApproveWfh(req.body.userId, req.body.wfhId);
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
                        // mailer.sendMailAfterApproveWfh(req.body.userId, req.body.wfhId);
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
                            // mailer.sendMailAfterApproveWfh(req.body.userId, req.body.wfhId);
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
                    console.log('sp_getTaskList')
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
}
module.exports.loadSchema = createSchema;
