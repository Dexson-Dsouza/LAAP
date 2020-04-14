function createSchema(app, mssql, pool2) {
    var jwtToken = require("./jwt.controller");

  //  var mailer = require("./mail.controller.js");

    var async = require("async");

    app.get("/api/getleavestatus", getLeaveStatus);

    app.get("/api/getleavecategory", getLeaveCategory);

    app.post("/api/add-leave", addLeave);

    app.get("/api/getleavesforEmployee", getLeavesForEmployee);

    function getLeaveStatus(req, res) {
        pool2.then(pool => {
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
					console.log(req.query);
                    request.input("userId", mssql.Int, parseInt(req.body.userId));
                    request.input("submitDate", mssql.VarChar(100), req.body.submitDate);
                    request.input("details", mssql.VarChar(4000), req.body.details);
                    request.input("leaveCategory", mssql.Int, parseInt(req.body.leaveCategory));
                    request.input("startDate", mssql.VarChar(100), req.body.startDate);
                    request.input("endDate", mssql.VarChar(100), req.body.endDate);

                    request
                        .execute("sp_AddLeave")
                        .then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            res.send({
                                message: "Leave added successfully!",
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

    function getLeavesForEmployee(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then(pool => {
                    var request = pool.request();
                    console.log(req.query);
                    request.input("userId", mssql.Int, req.query.userId);
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

}
module.exports.loadSchema = createSchema;
