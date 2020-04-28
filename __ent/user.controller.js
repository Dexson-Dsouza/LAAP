function createSchema(app, mssql, pool2, fs) {

    var jwtToken = require("./jwt.controller");

    let upload = require('./multer.config.js');
    
    var async = require("async");

    //FILE TYPES
    var PROFILE_PIC = 1;

    app.post('/api/file/uploadProfile/:userId', upload.single("file"), uploadProfilePicOfUser);

    app.get('/api/getuser', getUserDetails);

    app.get('/api/get-user-team-details', getUserTeamDetails);

    app.get('/api/getuserpermissions', getUserPermissions);

    app.get('/api/getusers', getUsers);

    app.get('/api/getuserdetails', getUserDetails);

    app.post('/api/remove-user-permission', removeUserPermission);

    app.get('/api/get-user-roles', getUserRoles);

    app.post('/api/update-user-pushid', updateUserPushId);

    app.post('/api/userExists', userExists);

    app.get('/api/getholidaylist', getHolidayList);

    app.get('/api/getlatestattendance', getlatestattendance);

    app.post('/api/add-hr-policy', addPolicy);

    app.get('/api/getprojects', getProjects);

    app.get('/api/getuserpersonaldetails', getUserPersonalDetails);

    app.post('/api/add-edit-userpersonaldetails', AddEditUserPersonalDetails);

    app.get('/api/getusereducationdetails', getUserEducationDetails);

    app.post('/api/add-edit-usereducationdetails', AddEditUserEducationDetails);

    app.post('/api/delete-usereducationdetails', deleteUserEducationDetails);

    function getUserPermissions(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.query);
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetUserPermission').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "User permissions retrived successfully!", success: true, response: data.recordset });
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

    function getUsers(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken == 'directory' || decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    request.input('page', mssql.Int, req.query.page);
                    request.input('limit', mssql.Int, req.query.limit);
                    request.input('str', mssql.VarChar(100), req.query.str);
                    request.execute('sp_SearchContacts').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Users retrieved successfully!", success: true, response: data.recordset });
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

    function getUserDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log('sp_GetEmployeeDetails')
                    var request = pool.request();
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetEmployeeDetails').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "User data retrieved successfully!", success: true, response: data.recordset[0] });
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

    function getUserTeamDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log('sp_GetEmployeeTeamDetails')
                    var request = pool.request();
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetEmployeeTeamDetails').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "User data retrieved successfully!", success: true, response: data.recordset[0] });
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

    function removeUserPermission(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    var userId = req.body.userId;
                    var permissionMappingId = req.body.permissionMappingId;
                    request.query('UPDATE UserPermissionMapper SET IsDeleted=' + 1 + " WHERE Id=" + permissionMappingId).then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: 'User Permission removed successfully!', success: true });
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

    function uploadProfilePicOfUser(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                console.log(req.params);
                if (!req.file) {
                    console.log("No file received");
                    res.send({
                        success: false
                    });
                } else {
                    var filename = req.file.originalname;
                    console.log(filename);
                    console.log('file received');
                    var tmpPath = "./uploads/tmpDir/" + req.file.originalname;
                    var newDir = "./uploads/profile/" + req.params.userId;
                    var newFile = newDir + "/" + req.file.originalname;
                    console.log(newFile);
                    if (!fs.existsSync(newDir)) {
                        fs.mkdirSync(newDir);
                    }
                    fs.stat(newFile, function (err, stat) {
                        if (err == null) {
                            console.log('File exists');
                            addProfilePicToDatabase(res, req.file.originalname, req.params.userId);
                        } else if (err.code === 'ENOENT') {
                            // file does not exist
                            console.log('File not exists on location... so adding new file');
                            fs.move(tmpPath, newFile, function (err) {
                                if (err) throw err
                                console.log('File Uploaded Successfully renamed - AKA moved!');
                                addProfilePicToDatabase(res, req.file.originalname, req.params.userId);
                            })
                        } else {
                            console.log('Some other error: ', err.code);
                            fs.move(tmpPath, newFile, function (err) {
                                if (err) throw err
                                console.log('File Uploaded Successfully renamed - AKA moved!');
                                addProfilePicToDatabase(res, req.file.originalname, req.params.userId);
                            })
                        }
                    });
                }
            } else {
                res.status("401");
                res.send(invalidRequestError);
            }
        });
    }

    function addProfilePicToDatabase(res, newFile, userId) {
        console.log("File added to database called");
        pool2.then((pool) => {
            console.log(newFile);
            console.log(userId);
            var request = pool.request();
            request.input('FileName', mssql.VarChar(500), newFile);
            request.input('FileType', mssql.Int, PROFILE_PIC);
            request.input('FileExtension', mssql.VarChar(100), newFile.split(".")[1]);
            request.input('FilePath', mssql.VarChar(2000), newFile);
            request.input('FileUploadDate', mssql.VarChar(500), new Date().getTime());
            request.input('AddedBy', mssql.Int, userId);
            request.execute('sp_AddUserFile').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                console.log("File added to database successfully");
                console.log(JSON.stringify(data));
                updatePicOfUser(res, data.recordset[0].Id, userId)
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function updatePicOfUser(res, fileId, userId) {
        console.log("Update Profile pic called");
        pool2.then((pool) => {
            var request = pool.request();

            request.query('UPDATE Users SET Photo=' + fileId + " WHERE Id=" + userId).then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: 'Profile Pic uploaded successfully!', success: true });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getUserRoles(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.query);
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetUserRoles').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "User permissions retrived successfully!", success: true, response: data.recordset });
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

    function updateUserPushId(req, res) {
        console.log("push notification==================");
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    request.query("UPDATE Users SET  PushId = '" + req.body.PushId + "' WHERE Id = " + req.body.Id).then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log("=============");
                        console.log(data);
                        res.send({ message: "User's PushId is updated successfully!", success: true });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

    function userExists(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.input('username', mssql.VarChar(2000), JSON.parse(req.body.params).UserName);
            request.execute("sp_GetUserDetailsByUsername").then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                if (typeof (data.recordset[0]) != "undefined") {
                    if (data.recordset[0].IsDeleted[0] == true) {
                        res.send({
                            message: "User is Deleted",
                            success: false,
                            code: 5008
                        })
                    } else {
                        res.send({
                            message: "User retrieved successfully!",
                            success: true,
                            response: data.recordset[0]
                        });
                    }
                }
                else {
                    res.send({
                        message: "User is Deleted",
                        success: false,
                        code: 5008
                    })
                }
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }
    function getHolidayList(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.query);
                    var query = 'select * from HolidayList';
                    console.log(query);
                    request.query(query).then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Holiday List Retrieved successfully!", success: true, response: data.recordset });
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

    function getlatestattendance(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.query);
                    console.log('[sp_latestAttendanceOfEmployee]');
                    request.input('empcode', mssql.Int, req.query.empcode);
                    request.execute("[sp_latestAttendanceOfEmployee]").then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Latest Attendance Retrieved!", success: true, response: data.recordset });
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
    function addPolicy(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    var query = 'insert into Policies(Data) values(' + req.body.text + ')';
                    request.query(query).then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "policy stored", success: true, response: data.recordset });
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

    function getProjects(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.query);
                    var query = 'select * from Projects';
                    console.log(query);
                    request.query(query).then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Holiday List Retrieved successfully!", success: true, response: data.recordset });
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

    function getUserPersonalDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log('sp_GetUserPersonalDetails')
                    var request = pool.request();
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetUserPersonalDetails').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "User data retrieved successfully!", success: true, response: data.recordset });
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

    function AddEditUserPersonalDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    console.log("sp_AddEditUserPersonalDetails");
                    request.input('userId', mssql.VarChar(2000), req.body.UserId);
                    request.input('secondary', mssql.VarChar(2000), req.body.SecondaryNo);
                    request.input('bloodgroup', mssql.VarChar(2000), req.body.BloodGroup);
                    request.input('bday', mssql.VarChar(2000), req.body.Birthday);
                    request.input('bio', mssql.VarChar(2000), req.body.Bio);
                    request.input('linkedin', mssql.VarChar(2000), req.body.LinkedIn);
                    request.input('insta', mssql.VarChar(2000), req.body.Instagram);
                    request.input('fb', mssql.VarChar(2000), req.body.Facebook);
                    request.input('twit', mssql.VarChar(2000), req.body.Twitter);
                    request.input('ext', mssql.VarChar(2000), req.body.Ext);
                    request.execute('sp_AddEditUserPersonalDetails').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        console.log("=============");
                        console.log(data);
                        res.send({ message: "User Info Saved successfully!", success: true });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });
                });
            }
        });
    }

    function getUserEducationDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log('sp_GetUserEducationDetails')
                    var request = pool.request();
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetUserEducationDetails').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "User data retrieved successfully!", success: true, response: data.recordset });
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

    function AddEditUserEducationDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                console.log(req.body.List);
                var someArray = req.body.List
                var arrayWithIndx = someArray.map(function (e, i) { return { obj: e, index: i } });
                console.log(arrayWithIndx);
                async.eachSeries(arrayWithIndx, function (member, callback) {
                    pool2.then((pool) => {
                        var request = pool.request();
                        console.log(member);
                        request.input('userId', mssql.Int, member.obj.UserId);
                        request.input('type', mssql.VarChar(2000), member.obj.Type);
                        request.input('details', mssql.VarChar(2000), member.obj.Details);
                        request.input('title', mssql.VarChar(2000), member.obj.Title);
                        request.input('id', mssql.VarChar(2000), member.obj.Id);
                        request.execute('sp_AddEditUserEducationDetails').then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            console.log("Index ==>", member.index);
                            if (member.index == (someArray.length - 1)) {
                                console.log("in if");
                                res.send({ message: "Data Saved!" });
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

    function deleteUserEducationDetails(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("Token Valid");
            if (decodedToken.email) {
                console.log(req.body.List);
                var someArray = req.body.List
                var arrayWithIndx = someArray.map(function (e, i) { return { obj: e, index: i } });
                console.log(arrayWithIndx);
                async.eachSeries(arrayWithIndx, function (member, callback) {
                    pool2.then((pool) => {
                        var request = pool.request();
                        console.log(member);
                        request.input('id', mssql.VarChar(2000), member.obj.Id);
                        request.execute('sp_DeleteUserEducationDetails').then(function (data, recordsets, returnValue, affected) {
                            mssql.close();
                            console.log("Index ==>", member.index);
                            if (member.index == (someArray.length - 1)) {
                                console.log("in if");
                                res.send({ message: "Data Saved!" });
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
}
module.exports.loadSchema = createSchema;