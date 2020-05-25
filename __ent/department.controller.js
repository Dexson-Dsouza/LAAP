function createSchema(app, mssql, pool2) {

    var jwtToken = require("./jwt.controller");

    // var mailer = require("./mail.controller.js");

    var async = require("async");

    app.post('/api/add-department', addDepartment);

    app.post('/api/assign-employees-to-department', assignEmployeesToDepartment);

    app.get('/api/get-employees-in-dept', getEmployeesByDepartment);

    app.get('/api/get-all-department', getDepartment);

    app.post('/api/delete-department', deleteDepartment);

    app.post('/api/delete-employee-from-department', deleteEmployeeFromDepartment);

    app.post('/api/update-department', updateDepartment);

    app.get('/api/checkif-employee-in-dept', checkEmployeeInDept);

    function addDepartment(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log("sp_addDepartment");
                    if (req.body.name == undefined ||
                        req.body.description == undefined ||
                        isNaN(parseInt(req.body.createdBy))
                        || new Date(req.body.createdOn) == "Invalid Date") {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    request.input('name', mssql.VarChar(2000), req.body.name);
                    request.input('description', mssql.VarChar(2000), req.body.description);
                    request.input('createdBy', mssql.Int, req.body.createdBy);
                    request.input('createdOn', mssql.VarChar(2000), req.body.createdOn);
                    request.execute('sp_addDepartment').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log("=============");
                        console.log(data);
                        res.send({
                            message: "Department added successfully!"
                            , success: true,
                            response: data.recordset

                        });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

    function assignEmployeesToDepartment(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                console.log(req.body.MemberList);
                var someArray = req.body.MemberList
                var arrayWithIndx = someArray.map(function (e, i) { return { obj: e, index: i } });
                console.log(arrayWithIndx);
                async.eachSeries(arrayWithIndx, function (member, callback) {
                    pool2.then((pool) => {
                        var request = pool.request();
                        console.log(member);
                        if (isNaN(parseInt(member.obj.UserId))
                            || isNaN(parseInt(member.obj.DeptId))
                            || isNaN(parseInt(member.obj.RoleId))
                            || isNaN(parseInt(member.obj.AddedBy))
                            || new Date(member.obj.AddedOn) == "Invalid Date") {
                            res.status("400");
                            res.send({
                                message: "invalid parameters",
                                success: false,
                            });
                            return;
                        }
                        request.input('UserId', mssql.Int, member.obj.UserId);
                        request.input('DeptId', mssql.Int, member.obj.DeptId);
                        request.input('RoleId', mssql.Int, member.obj.RoleId);
                        request.input('AddedBy', mssql.Int, member.obj.AddedBy);
                        request.input('AddedOn', mssql.VarChar(100), member.obj.AddedOn);
                        request.execute('sp_addEmployeeInDept').then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            console.log("Index ==>", member.index);
                            if (member.index == (someArray.length - 1)) {
                                console.log("in if");
                                res.send({ message: "Members are assign to Department successfully!" });
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

    function getEmployeesByDepartment(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log("sp_getMembersByDepartment");
                    if (isNaN(parseInt(req.query.DeptId))) {
                        res.status("400");
                        res.send({
                            message: "invalid DeptId",
                            success: false,
                        });
                        return;
                    }
                    request.input("DeptId", mssql.Int, req.query.DeptId);
                    request.execute('sp_getMembersByDepartment').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Department members retrieved successfully!", success: true, response: data.recordset });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

    function getDepartment(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log("sp_GetDepartment");
                    // if (req.query.RoleId != 1) {
                    //     request.input('DivisionId', mssql.Int, req.query.DivisionId);
                    //   };
                    //request.input('DivisionId', mssql.Int, req.body.DivisionId);
                    request.execute('sp_GetDepartment').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log("=============");
                        console.log(data);
                        res.send({ message: "Departments retrieved successfully!", success: true, response: data.recordset });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

    function deleteDepartment(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log('=====delete delpt=====');
                    console.log(req.body);
                    if (isNaN(parseInt(req.body.DeptId))) {
                        res.status("400");
                        res.send({
                            message: "invalid DeptId",
                            success: false,
                        });
                        return;
                    }
                    request.input('DeptId', mssql.Int, req.body.DeptId);
                    request.execute('sp_deleteDepartment').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: 'Department Deleted successfully!', success: true, response: data.recordset });

                    }).catch(function (err) {
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

    function deleteEmployeeFromDepartment(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log('=====delete status=====');
                    console.log(req.body);
                    if (isNaN(parseInt(req.body.UserId))
                        || isNaN(parseInt(req.body.DeptId))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    request.input('UserId', mssql.Int, req.body.UserId);
                    request.input('DeptId', mssql.Int, req.body.DeptId);
                    request.execute('sp_RemoveEmployeeFromDept').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({
                            message: 'Member Deleted successfully!',
                            success: true,
                            response: data.recordset
                        });
                    }).catch(function (err) {
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

    function updateDepartment(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    if (isNaN(parseInt(req.body.DeptId))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    request.input('DeptId', mssql.Int, req.body.DeptId);
                    request.input('name', mssql.VarChar(2000), req.body.name);
                    request.input('description', mssql.VarChar(5000), req.body.description);
                    request.execute('sp_updateDepartment').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log("=============");
                        console.log(data);
                        res.send({
                            message: "Department updated successfully!",
                            success: true,
                            response: data.recordset
                        });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

    function checkEmployeeInDept(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    request.query('SELECT * FROM EmployeeDeptMapper WHERE UserId = ' + req.query.UserId + ' and IsDeleted = 0').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        if (data.recordset.length == 0) {
                            res.send({
                                message: "New User!",
                                success: true,
                                response: { isPresent: false }
                            });
                        }
                        else {
                            res.send({
                                message: "User already exists!",
                                success: true,
                                response: { isPresent: true }
                            });
                        }
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

}
module.exports.loadSchema = createSchema;