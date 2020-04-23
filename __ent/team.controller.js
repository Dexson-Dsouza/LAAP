function createSchema(app, mssql, pool2) {

    var jwtToken = require("./jwt.controller");

 //   var mailer = require("./mail.controller.js");

    var async = require("async");

    app.post('/api/add-team', addTeam);

    app.post('/api/assign-employee-to-team', assignEmployeesToTeam);

    app.get('/api/get-employees-in-team', getEmployeesByTeam);

    app.get('/api/get-all-team', getAllTeams);
    ///////////////////////////////////////////////////////////////
    app.post('/api/delete-team', deleteTeam);

    app.post('/api/delete-employee-from-team', deleteEmployeeFromTeam);

    app.post('/api/update-team', updateTeam);


    function addTeam(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log("sp_addTeam");
                    request.input('name', mssql.VarChar(2000), req.body.name);
                    request.input('desc', mssql.VarChar(2000), req.body.desc);
                    request.execute('sp_addTeam').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log("=============");
                        console.log(data);
                        res.send({ message: "Team added successfully!", success: true, response: data.recordset[0] });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

    function assignEmployeesToTeam(req, res) {
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
                        request.input('UserId', mssql.Int, member.obj.UserId);
                        request.input('TeamId', mssql.Int, member.obj.TeamId);
                        request.input('RoleId', mssql.Int, member.obj.RoleId);
                        request.execute('sp_addEmployeeInTeam').then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            console.log("Index ==>", member.index);
                            if (member.index == (someArray.length - 1)) {
                                console.log("in if");
                                res.send({ message: "Members are assign to Team successfully!" });
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
    function getEmployeesByTeam(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log(req.query);
                    console.log("sp_getMembersByTeam");
                    var request = pool.request();
                    request.input("TeamId", mssql.Int, req.query.TeamId);
                    request.execute('sp_getMembersByTeam').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Team members retrieved successfully!", success: true, response: data.recordset });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }


    function getAllTeams(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log("sp_GetTeams");
                    // if (req.query.RoleId != 1) {
                    //     request.input('DivisionId', mssql.Int, req.query.DivisionId);
                    //   };
                    //request.input('DivisionId', mssql.Int, req.body.DivisionId);
                    request.execute('sp_GetTeams').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log("=============");
                        console.log(data);
                        res.send({ message: "Teams retrieved successfully!", success: true, response: data.recordset });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

    function deleteTeam(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log('=====delete team=====');
                    console.log(req.body);
                    request.input('TeamId', mssql.Int, req.body.TeamId);

                    request.execute('sp_deleteTeam').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: 'Division Deleted successfully!', success: true, response: data.recordset });

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

    function deleteEmployeeFromTeam(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log('=====delete status=====');
                    console.log(req.body);
                    request.input('UserId', mssql.Int, req.body.UserId);
                    request.input('TeamId', mssql.Int, req.body.TeamId);

                    request.execute('sp_RemoveEmployeeFromTeam').then(function (data, recordsets, returnValue, affected) {
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

    function updateTeam(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    request.input('TeamId', mssql.Int, req.body.TeamId);
                    request.input('name', mssql.VarChar(2000), req.body.name);
                    request.input('teamLead', mssql.Int, req.body.teamLead);
                    request.execute('sp_updateTeam').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log("=============");
                        console.log(data);
                        res.send({
                            message: "Division updated successfully!",
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
}
module.exports.loadSchema = createSchema;