const e = require("express");

function createSchema(app, mssql, pool2) {
    var jwtToken = require("./jwt.controller");

    var mailer = require("./mail.controller.js");

    var async = require("async");
    var moment = require('moment');

    app.get("/api/getleavestatus", getLeaveStatus);

    app.get("/api/getleavecategory", getLeaveCategory);

    app.post("/api/add-leave", addLeave);

    app.post("/api/update-leave", updateLeave);

    app.get("/api/employee-leaves", getLeavesForEmployee);

    app.get("/api/employee-on-leave-list", getEmployeeOnLeave);

    app.get('/api/pending-leave-approvals', pendingLeaveApprovals);

    app.post("/api/approve-reject-leave", approveRejectLeave);

    app.post("/api/disapprove-leave", disapprove)

    app.post("/api/cancel-leave", cancelLeave)

    app.post("/api/approve-reject-leave-cancellation", approveRejectLeaveCancellation);

    app.get("/api/leave-details", getLeaveDetails);

    function getLeaveStatus(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
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
            } else {
                res.status("401");
                res.send(invalidRequestError);
            }
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
                    if (isNaN(parseInt(req.body.userId)) || isNaN(parseInt(req.body.leaveCategory))
                        || (req.body.halfDay != undefined && isNaN(parseInt(req.body.halfDay)))
                        || new Date(req.body.submitDate) == "Invalid Date" || new Date(req.body.startDate) == "Invalid Date" || new Date(req.body.endDate) == "Invalid Date") {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    var moment = require('moment');
                    request.input("userId", mssql.Int, parseInt(req.body.userId));
                    request.input("submitDate", mssql.VarChar(100), req.body.submitDate);
                    request.input("details", mssql.VarChar(4000), req.body.details);
                    request.input("leaveCategory", mssql.Int, parseInt(req.body.leaveCategory));
                    request.input("startDate", mssql.VarChar(100), req.body.startDate);
                    request.input("endDate", mssql.VarChar(100), req.body.endDate);
                    request.input("halfDay", mssql.Int, parseInt(req.body.halfDay));
                    request.input("isRegularize", mssql.Int, (req.body.isRegularize));
                    var oneDay = 24 * 60 * 60 * 1000;
                    var startDate = new Date(req.body.startDate);
                    var endDate = new Date(req.body.endDate);
                    var diffDays = Math.round(((endDate.getTime() - startDate.getTime()) / (oneDay)));
                    console.log(diffDays);
                    if (diffDays < 0) {
                        res.send({
                            message: "invalid start and end date for leave",
                            success: false,
                        });
                        return;
                    }
                    var request3 = pool.request();
                    request3.input("userId", mssql.Int, parseInt(req.body.userId));
                    request3.input("fromdate", mssql.VarChar(100), req.body.startDate);
                    request3.input("todate", mssql.VarChar(100), req.body.endDate);
                    request3
                        .execute("sp_CheckIfLeaveExists")
                        .then(function (data, recordsets, returnValue, affected) {
                            if (typeof (data.recordset[0]) != "undefined") {
                                res.send({
                                    message: "Leave already exists for the selected date range.",
                                    success: false,
                                });
                                return;
                            }
                            var request4 = pool.request();
                            var prob = false;
                            request4.input('userId', mssql.Int, parseInt(req.body.userId));
                            request4.execute('sp_GetEmployeeDetails').then(function (data, recordsets, returnValue, affected) {
                                if (data.recordset[0] && data.recordset[0].ProbationStartDate && data.recordset[0].ProbationEndDate) {
                                    if (moment(req.body.submitDate).isSameOrAfter(data.recordset[0].ProbationStartDate)
                                        && moment(req.body.submitDate).isSameOrBefore(data.recordset[0].ProbationEndDate)) {
                                        prob = true;
                                    }
                                }
                                if (parseInt(req.body.leaveCategory) == 5 && prob == false) {
                                    request.input("LWP", mssql.Int, 0);
                                    request.input("endDate", mssql.VarChar(100), req.body.startDate);
                                    var request2 = pool.request();
                                    var date = moment(req.body.startDate).format('YYYY-MM-DD');
                                    var query = 'select * from HolidayList where holidaytype=1';
                                    console.log(date);
                                    request2.query(query).then(function (data, recordsets, returnValue, affected) {
                                        var floatingList = [];
                                        floatingList = data.recordset
                                        var exists = false;
                                        floatingList.find((x) => {
                                            if (moment(x.HolidayDate).format('YYYY-MM-DD') == date) {
                                                exists = true;
                                                return;
                                            }
                                        })
                                        if (exists) {
                                            request
                                                .execute("sp_AddLeave")
                                                .then(function (data, recordsets, returnValue, affected) {
                                                    mssql.close();
                                                    res.send({
                                                        message: "Leave added successfully!",
                                                        success: true,
                                                    });
                                                    mailer.sendMailAfterLeaveAdd(data.recordset[0].Id, req.body.userId, diffDays);
                                                })
                                                .catch(function (err) {
                                                    console.log(err);
                                                    res.send(err);
                                                });
                                        } else {
                                            res.send({
                                                message: "Selected day is not applicable for floating leave.",
                                                success: false,
                                            });
                                        }
                                    }).catch(function (err) {
                                        console.log(err);
                                        res.send(err);
                                    });
                                } else {
                                    request.input("LWP", mssql.Int, (prob && prob == true) ? 1 : 0);
                                    request
                                        .execute("sp_AddLeave")
                                        .then(function (data, recordsets, returnValue, affected) {
                                            mssql.close();
                                            res.send({
                                                message: "Leave added successfully!",
                                                success: true,
                                            });
                                            if (diffDays >= 2) {
                                                req.body.leaveId = data.recordset[0].Id;
                                                addHodApproval(req, res);
                                            }
                                            mailer.sendMailAfterLeaveAdd(data.recordset[0].Id, req.body.userId, diffDays);
                                        })
                                        .catch(function (err) {
                                            console.log(err);
                                            res.send(err);
                                        });
                                }

                            }).catch(function (err) {
                                console.log(err);
                                res.send(err);
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

    function addHodApproval(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            var query = "select UserId from [EmployeeDeptMapper] where Deptid =(select DeptId from EmployeeDeptMapper where UserId=" + req.body.userId + ") and Roleid=1 and isDeleted=0"
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
                            for (var x of data2.recordset) {
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
                            console.log(arr, req.body.userId);

                            async.eachSeries(arr, function (__t, callback) {
                                var request = pool.request();
                                var query = "insert into LeaveDetails (LeaveId,ApproverId,Status) values(" +
                                    + req.body.leaveId + ","
                                    + parseInt(__t.UserId) + ",3)";
                                console.log(query)
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
                }).catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
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
                    if (isNaN(parseInt(req.body.leaveId)) || isNaN(parseInt(req.body.userId))
                        || (req.body.leaveCategory != undefined && isNaN(parseInt(req.body.leaveCategory)))
                        || (req.body.halfDay != undefined && isNaN(parseInt(req.body.halfDay)))
                        || new Date(req.body.submitDate) == "Invalid Date" || new Date(req.body.startDate) == "Invalid Date"
                        || new Date(req.body.endDate) == "Invalid Date") {
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
                    if (req.query.limit) {
                        request.input("limit", mssql.Int, req.query.limit);
                    }
                    if (req.query.page) {
                        request.input("page", mssql.Int, req.query.page);
                    }
                    if (req.query.category != undefined) {
                        request.input("category", mssql.Int, parseInt(req.query.category));
                    }
                    if (req.query.status != undefined) {
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
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
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
            } else {
                res.status("401");
                res.send(invalidRequestError);
            }
        });
    }

    function pendingLeaveApprovals(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.query);
            console.log('sp_GetPendingLeaveApprovals');
            if ((req.query.userId == undefined || isNaN(parseInt(req.query.userId)))) {
                res.status("400");
                res.send({
                    message: "invalid UserId",
                    success: false,
                });
                return;
            }
            request.input("userId", mssql.Int, req.query.userId);
            request
                .execute("sp_GetPendingLeaveApprovals")
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    async.eachSeries(data.recordset, function (x, callback) {
                        workingDaysBetweenDates((x.StartDate), (x.EndDate), x.Userid).then(count => {
                            x['workingdays'] = count;
                            callback();
                        })
                    },
                        () => {
                            res.send({
                                message: "Data retrieved successfully!",
                                success: true,
                                response: data.recordset
                            });
                        })

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
            if ((req.body.userId == undefined || isNaN(parseInt(req.body.userId))) ||
                (req.body.leaveId == undefined || isNaN(parseInt(req.body.leaveId))) ||
                (req.body.status == undefined || isNaN(parseInt(req.body.status)))) {
                res.status("400");
                res.send({
                    message: "invalid parameters",
                    success: false,
                });
                return;
            }
            request.input("userId", mssql.Int, parseInt(req.body.userId));
            request.input("leaveId", mssql.Int, parseInt(req.body.leaveId));
            request.input("status", mssql.Int, parseInt(req.body.status));
            request.input("reason", mssql.VarChar(4000), req.body.reason)
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
                    mailer.sendMailAfterApproveLeave(req.body.userId, req.body.leaveId);
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
            request.input("leaveId", mssql.VarChar(4000), req.body.leaveId)
            request
                .execute("sp_RejectLeave")
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
                console.log('single accepted')
                request
                    .query(query)
                    .then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        deductLeaveBalance(req.body.leaveId, req.body.userId);
                        res.send({
                            message: "Leave Status Updated successfully!",
                            success: true,
                        });
                        checkForRegularize(req.body.leaveId);
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
                    query = "update EmployeeLeave set status = 1 where status=3 and Id = " + req.body.leaveId;
                    request
                        .query(query)
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            deductLeaveBalance(req.body.leaveId, req.body.userId);
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
            var request1 = pool.request();
            request1.input("leaveId", mssql.Int, leaveId);
            request1.execute("sp_GetLeaveDetailsByLeaveId").then(function (data) {
                mssql.close();
                console.log('=========')
                console.log(data.recordset[0]);
                var start = new Date(data.recordset[0].StartDate);
                var end = new Date(data.recordset[0].EndDate);
                if (data.recordset[0].LWP == 0) {
                    workingDaysBetweenDates(start, end, data.recordset[0].Userid).then(count => {
                        var w = count; // days in leave
                        console.log('working days ' + w);
                        var request = pool.request();
                        request.input('userId', mssql.Int, data.recordset[0].Userid);
                        request.execute('sp_GetEmployeeDetails').then(function (data2, recordsets, returnValue, affected) {
                            var fc = data2.recordset[0].FloatingCount; // floating count of user
                            console.log('floating left ' + fc);
                            if (fc > 0 && data.recordset[0].HalfDay == 0) {
                                var floatingLeaves = 0; // floating leave days between leave range
                                var request2 = pool.request();
                                var query = 'select * from HolidayList where holidaytype=1';
                                request2.query(query).then(function (data3, recordsets, returnValue, affected) {
                                    var floatingList = [];
                                    floatingList = data3.recordset
                                    for (var x of floatingList) {
                                        if (
                                            (moment(x.HolidayDate).isBetween(start, end, undefined, []))
                                        ) {
                                            floatingLeaves++;
                                            if (fc == floatingLeaves) {
                                                break;
                                            }
                                        }
                                    }
                                    console.log('floating leaves ' + floatingLeaves);
                                    if (floatingLeaves > 0) {
                                        var request = pool.request();
                                        request.input("leaveId", mssql.Int, leaveId);
                                        request.input("userId", mssql.Int, data.recordset[0].Userid);
                                        request.input("numberofdays", mssql.Int, floatingLeaves);
                                        request
                                            .execute("sp_deductFloatingBalance")
                                            .then(function (data, recordsets, returnValue, affected) {
                                                mssql.close();
                                            })
                                            .catch(function (err) {
                                                console.log(err);
                                                res.send(err);
                                            });
                                    }
                                    if (w > 0) {
                                        var request = pool.request();
                                        request.input("leaveId", mssql.Int, leaveId);
                                        request.input("userId", mssql.Int, data.recordset[0].Userid);
                                        request.input("numberofdays", mssql.Int, (w - floatingLeaves));
                                        request
                                            .execute("sp_deductLeaveBalance")
                                            .then(function (data, recordsets, returnValue, affected) {
                                                mssql.close();
                                            })
                                            .catch(function (err) {
                                                console.log(err);
                                                res.send(err);
                                            });
                                    }
                                }).catch(function (err) {
                                    console.log(err);
                                    res.send(err);
                                });
                            } else {
                                var request = pool.request();
                                request.input("leaveId", mssql.Int, leaveId);
                                request.input("userId", mssql.Int, data.recordset[0].Userid);
                                request.input("numberofdays", mssql.Int, w);
                                request
                                    .execute("sp_deductLeaveBalance")
                                    .then(function (data, recordsets, returnValue, affected) {
                                        mssql.close();
                                    })
                                    .catch(function (err) {
                                        console.log(err);
                                        res.send(err);
                                    });
                            }
                        }).catch(function (err) {
                            console.log(err);
                            res.send(err);
                        });
                    })
                }
            })
        })
            .catch(function (err) {
                console.log(err);
                res.send(err);
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
                        + "ON U.Photo = UserFile.FileId where StartDate<='" + req.query.date + "' and EndDate>='" + req.query.date + "'";
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
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('disapproveLeave');
                    if ((req.body.userId == undefined || isNaN(parseInt(req.body.userId))) ||
                        (req.body.leaveId == undefined || isNaN(parseInt(req.body.leaveId))) ||
                        (req.body.disapproveBy == undefined || isNaN(parseInt(req.body.disapproveBy))) ||
                        (req.body.DisapproveReason == undefined)) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    var query = "select * from EmployeeLeave where Id = " + req.body.leaveId;
                    request
                        .query(query)
                        .then(function (data, recordsets, returnValue, affected) {
                            var leave = data.recordset[0];
                            var request = pool.request();
                            var query = "update EmployeeLeave set status = 5,DisapproveBy='" + req.body.disapproveBy + "',DisapproveReason='" + req.body.DisapproveReason + "' where Id = " + req.body.leaveId;
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
            } else {
                res.status("401");
                res.send(invalidRequestError);
            }
        });

    }

    function restoreLeaves(leaveId, userId) {
        pool2.then(pool => {
            var request1 = pool.request();
            request1.input("leaveId", mssql.Int, leaveId);
            request1.execute("sp_GetLeaveDetailsByLeaveId").then(function (data) {
                mssql.close();
                console.log('=========')
                console.log(data.recordset[0]);
                var start = new Date(data.recordset[0].StartDate);
                var end = new Date(data.recordset[0].EndDate);
                if (data.recordset[0].LWP == 0) {
                    workingDaysBetweenDates(start, end, data.recordset[0].Userid).then(count => {
                        var w = count; // days in leave
                        console.log('working days ' + w);
                        if (data.recordset[0].HalfDay == 0) {
                            var floatingLeaves = 0; // floating leave days between leave range
                            var request2 = pool.request();
                            var query = 'select * from HolidayList where holidaytype=1';
                            request2.query(query).then(function (data3, recordsets, returnValue, affected) {
                                var floatingList = [];
                                floatingList = data3.recordset
                                for (var x of floatingList) {
                                    if (
                                        (moment(x.HolidayDate).isBetween(start, end, undefined, []))
                                    ) {
                                        floatingLeaves++;
                                    }
                                }
                                console.log('floating leaves ' + floatingLeaves);
                                if (floatingLeaves > 0) {
                                    var request = pool.request();
                                    request.input("leaveId", mssql.Int, leaveId);
                                    request.input("userId", mssql.Int, data.recordset[0].Userid);
                                    request.input("numberofdays", mssql.Int, floatingLeaves);
                                    request
                                        .execute("sp_restoreFloatingBalance")
                                        .then(function (data, recordsets, returnValue, affected) {
                                            mssql.close();
                                        })
                                        .catch(function (err) {
                                            console.log(err);
                                            res.send(err);
                                        });
                                }
                                if (w > 0) {
                                    var request = pool.request();
                                    request.input("leaveId", mssql.Int, leaveId);
                                    request.input("userId", mssql.Int, data.recordset[0].Userid);
                                    request.input("numberofdays", mssql.Int, (w - floatingLeaves));
                                    request
                                        .execute("sp_restoreLeaveBalance")
                                        .then(function (data, recordsets, returnValue, affected) {
                                            mssql.close();
                                        })
                                        .catch(function (err) {
                                            console.log(err);
                                            res.send(err);
                                        });
                                }
                            }).catch(function (err) {
                                console.log(err);
                                res.send(err);
                            });
                        } else {
                            var request = pool.request();
                            request.input("leaveId", mssql.Int, leaveId);
                            request.input("userId", mssql.Int, data.recordset[0].Userid);
                            request.input("numberofdays", mssql.Int, w);
                            request
                                .execute("sp_restoreLeaveBalance")
                                .then(function (data, recordsets, returnValue, affected) {
                                    mssql.close();
                                })
                                .catch(function (err) {
                                    console.log(err);
                                    res.send(err);
                                });
                        }
                    })
                }
            })

        })
            .catch(function (err) {
                console.log(err);
                res.send(err);
            });
    }

    function checkForRegularize(leaveId) {
        pool2.then(pool => {
            console.log("checkForRegularize");
            console.log(leaveId)
            var request = pool.request();
            var query = "select * from EmployeeLeave where Id =" + leaveId;
            request
                .query(query)
                .then(function (data, recordsets, returnValue, affected) {
                    var leave = data.recordset[0];
                    console.log(leave);
                    if (leave.isRegularize == 1) {
                        console.log('regularize');
                        request.input("AttendanceDate", mssql.DateTime, leave.StartDate)
                        request.input("UserId", mssql.Int, parseInt(leave.Userid));
                        request.input("Status", mssql.VarChar(4000), (leave.LWP && leave.LWP == 0) ? " On Leave(PL)" : "Leave Without Pay")
                        request.input("StatusCode", mssql.VarChar(4000), (leave.LWP && leave.LWP == 0) ? "PL" : "LWP")
                        request
                            .execute("sp_updateAttendanceStatus")
                            .then(function (data, recordsets, returnValue, affected) {
                                mssql.close();
                                console.log('changed attendance status');
                            })
                            .catch(function (err) {
                                console.log(err);
                                res.send(err);
                            });
                    } else if (leave.isRegularize == 0) {
                        console.log('not regularize')
                    }
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        })
    }

    function cancelLeave(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log('sp_cancelLeave');
                    if ((req.body.userId == undefined || isNaN(parseInt(req.body.userId))) ||
                        (req.body.leaveId == undefined || isNaN(parseInt(req.body.leaveId))) ||
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
                    request.input("leaveId", mssql.Int, parseInt(req.body.leaveId));
                    request.input("submitDate", mssql.VarChar(4000), req.body.submitDate)
                    request.input("reason", mssql.VarChar(4000), req.body.reason)
                    request
                        .execute('sp_cancelLeave')
                        .then(function (data, recordsets, returnValue, affected) {
                            mailer.sendMailAfterCancelReq(req.body.leaveId, req.body.userId);
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

    function approveRejectLeaveCancellation(req, res) {
        pool2.then(pool => {
            var request = pool.request();
            console.log(req.body);
            console.log('sp_ApproveRejectLeave');
            if ((req.body.userId == undefined || isNaN(parseInt(req.body.userId))) ||
                (req.body.leaveId == undefined || isNaN(parseInt(req.body.leaveId))) ||
                (req.body.status == undefined || isNaN(parseInt(req.body.status)))) {
                res.status("400");
                res.send({
                    message: "invalid parameters",
                    success: false,
                });
                return;
            }
            var status = req.body.status;
            var leaveId = req.body.leaveId;
            request.input("userId", mssql.Int, parseInt(req.body.userId));
            request.input("leaveId", mssql.Int, parseInt(req.body.leaveId));
            request.input("status", mssql.Int, parseInt(req.body.status));
            request.input("reason", mssql.VarChar(4000), req.body.reason)
            request
                .execute("sp_ApproveRejectLeave")
                .then(function (data, recordsets, returnValue, affected) {
                    mssql.close();
                    console.log(data);
                    if (status == 2) {
                        var request = pool.request();
                        var query = "update EmployeeLeave set CancelReason=null,CancelDate=null where Id =" + leaveId;
                        request.input("leaveId", mssql.Int, parseInt(req.body.leaveId));
                        request
                            .execute('sp_rejectCancellation')
                            .then(function (data, recordsets, returnValue, affected) {
                                res.send({
                                    message: "Leave Cancellation Rejected successfully!",
                                    success: true,
                                });
                            }).catch(function (err) {
                                console.log(err);
                                res.send(err);
                            });
                    } else {
                        updateStatusofLeaveCancellation(req, res, data.recordset);
                    }
                    mailer.sendMailAfterApproveCancellation(req.body.userId, req.body.leaveId);
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
        });
    }

    function updateStatusofLeaveCancellation(req, res, records) {
        pool2.then(pool => {
            var request = pool.request();
            var query;
            console.log(req.body);
            if (records.length == 1) {
                query = "select * from EmployeeLeave where Id = " + req.body.leaveId;
                console.log('single  Cancellation accepted')
                request
                    .query(query)
                    .then(function (data, recordsets, returnValue, affected) {
                        var LeaveDetails = data.recordset[0];
                        var request = pool.request();
                        query = "update EmployeeLeave set status = 4 where Id = " + req.body.leaveId;
                        request
                            .query(query)
                            .then(function (data, recordsets, returnValue, affected) {
                                mssql.close();
                                if (LeaveDetails.Status == 1) {
                                    restoreLeaves(LeaveDetails.Id, LeaveDetails.Userid);
                                }
                                console.log(data);
                                res.send({
                                    message: "Leave Cancellation Accepted successfully!",
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
                    console.log('group Cancellation accept');
                    var request = pool.request();
                    query = "select * from EmployeeLeave where Id = " + req.body.leaveId;
                    request
                        .query(query)
                        .then(function (data, recordsets, returnValue, affected) {
                            var LeaveDetails = data.recordset[0];
                            if (LeaveDetails.Status == 1) {
                                restoreLeaves(LeaveDetails.Id, LeaveDetails.Userid);
                            }
                            // query = "update EmployeeLeave set status = 1 where status=3 and Id = " + req.body.leaveId;
                            query = "update EmployeeLeave set status = 4  Id = " + req.body.leaveId;
                            request
                                .query(query)
                                .then(function (data, recordsets, returnValue, affected) {
                                    mssql.close();
                                    console.log(data);
                                    res.send({
                                        message: "Leave Cancellation Accepted successfully!",
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
                    console.log('group Cancellation pending')
                    res.send({
                        message: "Leave Cancellation Accepted successfully!",
                        success: true,
                    });
                }
            }

        });
    }

    function getLeaveDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log('sp_GetLeaveDetails');
                    request.input("Id", mssql.Int, req.query.Id);
                    request
                        .execute("sp_GetLeaveDetails")
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

    function workingDaysBetweenDates(s, e, userId) {
        // Validate input
        return new Promise((ress, rej) => {
            let startDate = new Date(moment(s, 'YYYY-MM-DD HH:mm:ss').utc().format("MM-DD-YYYY"));
            let endDate = new Date(moment(e, 'YYYY-MM-DD HH:mm:ss').utc().format("MM-DD-YYYY"));
            if (endDate < startDate)
                ress(0);
            // Calculate days between dates
            var millisecondsPerDay = 86400 * 1000; // Day in milliseconds
            // startDate.setHours(0, 0, 0, 1);  // Start just after midnight
            // endDate.setHours(23, 59, 59, 999);  // End just before midnight
            let diff = endDate - startDate;  // Milliseconds between datetime objects    
            let days = Math.ceil(diff / millisecondsPerDay)+1;
            var holiday = 0;
            pool2.then(pool => {
                var request1 = pool.request();
                var query = 'select * from HolidayList';
                request1.query(query).then(function (data, recordsets, returnValue, affected) {
                    var H_list = data.recordset;
                    H_list.forEach((x) => {
                        if (x.HolidayType == 0 && (moment(x.HolidayDate).isBetween(startDate, endDate, undefined, []))) {
                            holiday++;
                        }
                    })
                    console.log('holidays ', holiday, days, startDate, endDate);
                    var request = pool.request();
                    request.input('userId', mssql.Int, userId);
                    request
                        .execute("sp_GetEmployeeDetails")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            if (data.recordset[0] && data.recordset[0].ProbationStartDate && data.recordset[0].ProbationEndDate) {
                                if (moment(new Date()).isSameOrAfter(data.recordset[0].ProbationStartDate)
                                    && moment(new Date()).isSameOrBefore(data.recordset[0].ProbationEndDate)) {
                                    ress(days - holiday);
                                }
                            }
                            else {
                                // Subtract two weekend days for every week in between
                                var weeks = Math.floor(days / 7);
                                days = days - (weeks * 2);

                                // Handle special cases
                                var startDay = startDate.getDay();
                                var endDay = endDate.getDay();

                                // Remove weekend not previously removed.   
                                if (startDay - endDay > 1)
                                    days = days - 2;

                                // Remove start day if span starts on Sunday but ends before Saturday
                                if (startDay == 0 && endDay != 6)
                                    days = days - 1

                                // Remove end day if span ends on Saturday but starts after Sunday
                                if (endDay == 6 && startDay != 0)
                                    days = days - 1

                                ress(days - holiday);
                            }
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }).catch(function (err) {
                    console.log(err);
                    res.send(err);
                });
            });
        })
    }

}
module.exports.loadSchema = createSchema;
