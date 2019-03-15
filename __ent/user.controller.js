function createSchema(app, mssql, pool2, fs) {

    var jwtToken = require("./jwt.controller");

    let upload = require('./multer.config.js');

    //FILE TYPES
    var PROFILE_PIC = 1;

    app.post('/api/file/uploadProfile/:userId', upload.single("file"), uploadProfilePicOfUser);

    app.get('/api/getuser', getUserDetails);

    app.get('/api/getuserpermissions', getUserPermissions);

    app.get('/api/getusers', getUsers);

    app.get('/api/getuserdetails', getUserDetails);

    app.post('/api/remove-user-permission', removeUserPermission);

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
            if (decodedToken.email) {
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
                    var request = pool.request();
                    request.input('userId', mssql.Int, req.query.userId);
                    request.execute('sp_GetUserDetails').then(function (data, recordsets, returnValue, affected) {
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
}
module.exports.loadSchema = createSchema;