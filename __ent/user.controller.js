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

    app.post('/api/edit-hr-policy', editPolicy);

    app.get('/api/get-hr-policy', getPolicy);

    app.get('/api/getprojects', getProjects);

    app.get('/api/getuserpersonaldetails', getUserPersonalDetails);

    app.post('/api/add-edit-userpersonaldetails', AddEditUserPersonalDetails);

    app.get('/api/getusereducationdetails', getUserEducationDetails);

    app.post('/api/add-edit-usereducationdetails', AddEditUserEducationDetails);

    app.get('/api/get-profile-change-for-approval', getProfileChanges);

    app.post('/api/approve-reject-profile-changes', ApproveRejProfileChanges);

    app.post('/api/delete-usereducationdetails', deleteUserEducationDetails);

    app.get('/api/getbirthdaylist', getbirthdaylist);

    app.get('/api/getanniversarylist', getanniversarylist);

    app.get('/api/getuserreports', getuserreports);

    function getUserPermissions(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log("sp_GetEmployeePermission");
                    console.log(req.query);
                    if (isNaN(parseInt(req.query.userId))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetEmployeePermission').then(function (data, recordsets, returnValue, affected) {
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
                    if (isNaN(parseInt(req.query.userId))) {
                        res.status("400");
                        res.send({
                            message: "invalid userId",
                            success: false,
                        });
                        return;
                    }
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
                    console.log('sp_GetEmployeeTeamDetails');
                    if (isNaN(parseInt(req.query.userId))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    var request = pool.request();
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetEmployeeTeamDetails').then(function (data, recordsets, returnValue, affected) {
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
                    console.log(req.body)
                    console.log("addPolicy")
                    var request = pool.request();
                    var query = "insert into Policies(Title,Data) values('" + req.body.Title + "','" + req.body.Data + "')";
                    request.query(query).then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "policy stored", success: true });
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

    function editPolicy(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log(req.body)
                    console.log("editPolicy");
                    if (isNaN(parseInt(req.body.Id))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    var request = pool.request();
                    var query = "update Policies set Title= '" + req.body.Title + "',Data ='" + req.body.Data + "' where id = " + req.body.Id;
                    request.query(query).then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "policy update", success: true });
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

    function getPolicy(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    var query = 'select * from Policies';
                    request.query(query).then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "policy retrieved", success: true, response: data.recordset });
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
                    console.log('sp_GetUserPersonalDetails');
                    if (isNaN(parseInt(req.query.userId))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    var request = pool.request();
                    request.input('userId', mssql.Int, req.query.userId);
                    request.input('email', mssql.VarChar(100), decodedToken.email);
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
                    if (isNaN(parseInt(req.body.UserId))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
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
                    console.log('sp_GetUserEducationDetails');
                    if (isNaN(parseInt(req.query.userId))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    var request = pool.request();
                    request.input('userId', mssql.Int, req.query.userId);
                    request.input('email', mssql.VarChar(100), decodedToken.email);
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
                        if (isNaN(parseInt(member.obj.UserId))) {
                            res.status("400");
                            res.send({
                                message: "invalid parameters",
                                success: false,
                            });
                            return;
                        }
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
                        if (isNaN(parseInt(member.obj.Id))) {
                            res.status("400");
                            res.send({
                                message: "invalid parameters",
                                success: false,
                            });
                            return;
                        }
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

    function getbirthdaylist(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log('sp_GetBirthdayList')
                    var request = pool.request();
                    request.execute('sp_GetBirthdayList').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Birthday List retrieved successfully!", success: true, response: data.recordset });
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

    function getanniversarylist(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log('sp_GetAnniversaryList')
                    var request = pool.request();
                    request.execute('sp_GetAnniversaryList').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        var records = data.recordset;
                        var moment = require('moment');
                        let resp = [];
                        for (var r of records) {
                            // let currentdate = moment(new Date());
                            // console.log(r.DOJ)
                            let currentdate = moment("2020-03-01");
                            let date = moment(r.DOJ);
                            //console.log(date.get('year') < currentdate.get('year'));
                            if (date.get('year') < currentdate.get('year')) {
                                let years = currentdate.get('year') - date.get('year');
                                date.set('year', currentdate.get('year'));
                                let diff = date.diff(currentdate, 'days');
                                // console.log(diff);
                                if (diff < 30 && diff > 0) {
                                    r['years'] = years;
                                    resp.push(r);
                                }
                            }
                        }
                        res.send({ message: "Anniversary List retrieved successfully!", success: true, response: resp });
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

    function getuserreports(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log(req.query);
                    console.log('sp_GetUserMonthlyReports');
                    if (isNaN(parseInt(req.query.Month))
                        || isNaN(parseInt(req.query.Year))
                        || (req.query.UserId != undefined && isNaN(parseInt(req.query.UserId)))) {
                        res.status("400");
                        res.send({
                            message: "invalid parameters",
                            success: false,
                        });
                        return;
                    }
                    var request = pool.request();
                    request.input('Month', mssql.Int, req.query.Month);
                    request.input('Year', mssql.Int, req.query.Year);
                    request.input('UserId', mssql.Int, req.query.UserId);
                    request.execute('sp_GetUserMonthlyReports').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Reports retrieved successfully!", success: true, response: data.recordset });
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

    function getProfileChanges(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    console.log('sp_GetPendingProfileDataApprovals')
                    var request = pool.request();
                    var resp = [];
                    request.execute('sp_GetPendingProfileDataApprovals').then(function (data, recordsets, returnValue, affected) {
                        var request = pool.request();
                        var _p = [];
                        _p = data.recordset;
                        request.execute('sp_GetPendingEducationDataApprovals').then(function (data, recordsets, returnValue, affected) {
                            var _e = [];
                            _e = data.recordset;
                            // console.log(_p);
                            // console.log(_e);
                            var m = new Map()
                            _p.forEach(x => {
                                m.set(x.UserId, { personalDetail: x, education: [] });
                            })
                            _e.forEach((x) => {
                                if (m.has(x.UserId)) {
                                    console.log(m.get(x.UserId))
                                    m.get(x.UserId).education.push(x);
                                } else {
                                    m.set(x.UserId, { 'education': [] });
                                    m.get(x.UserId).education.push(x);
                                }
                            })
                            var resul = [...m.values()];
                            let i = 0;
                            async.eachSeries(resul, (x, callback) => {
                                let userid;
                                if (x.personalDetail && x.personalDetail.UserId) {
                                    userid = x.personalDetail.UserId;
                                } else {
                                    userid = x.education[0].UserId;
                                }
                                console.log('userid ', userid)
                                var request = pool.request();
                                request.input('userId', mssql.Int, userid);
                                request.execute('sp_GetEmployeeDetails').then(function (data, recordsets, returnValue, affected) {
                                    console.log(data.recordset[0])
                                    resul[i]["userDetail"] = data.recordset[0];
                                    i++;
                                    callback();
                                }).catch(function (err) {
                                    console.log(err);
                                    callback();
                                });
                            }, () => {
                                mssql.close();
                                res.send({
                                    message: "Pending changes retrieved successfully!", success: true, response: resul
                                });
                            })
                        })
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

    function ApproveRejProfileChanges(req, res) {
        jwtToken.verifyRequest(req, res, decodedToken => {
            console.log("valid token");
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    request.input('Status', mssql.Int, req.body.Status);
                    request.input('UserId', mssql.Int, req.body.UserId);
                    request.input('Approver', mssql.Int, req.body.ApprovedBy);
                    request.input('Reason', mssql.VarChar(100), req.body.Reason);
                    var education = [];
                    var approver=req.body.ApprovedBy;
                    education = req.body.EducationDetails;
                    if (req.body.Status) {
                        console.log("sp_updateProfileChanges");
                        request.execute('sp_updateProfileChanges').then(function (data, recordsets, returnValue, affected) {
                            async.eachSeries(education, (_x, callback) => {
                                var request = pool.request();
                                request.input('Status', mssql.Int, _x.Status);
                                request.input('Id', mssql.Int, _x.Id);
                                request.input('Approver', mssql.Int, approver);
                                request.input('Reason', mssql.VarChar(100), _x.Reason);
                                console.log('sp_updateEducationChanges')
                                request.execute('sp_updateEducationChanges').then(function (data, recordsets, returnValue, affected) {
                                    callback();
                                }).catch(function (err) {
                                    console.log(err);
                                    callback();
                                });
                            }, () => {
                                mssql.close();
                                res.send({ message: "Profile updated successfully!", success: true });
                            })
                        }).catch(function (err) {
                            console.log(err);
                            res.send(err);
                        });
                    }
                    else {
                        async.eachSeries(education, (_x, callback) => {
                            var request = pool.request();
                            request.input('Status', mssql.Int, _x.Status);
                            request.input('Id', mssql.Int, _x.Id);
                            console.log('sp_updateEducationChanges')
                            request.execute('sp_updateEducationChanges').then(function (data, recordsets, returnValue, affected) {
                                callback();
                            }).catch(function (err) {
                                console.log(err);
                                callback();
                            });
                        }, () => {
                            mssql.close();
                            res.send({ message: "Profile updated successfully!", success: true });
                        })
                    }
                });
            }
        })
    }

}
module.exports.loadSchema = createSchema;