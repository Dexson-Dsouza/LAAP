function createSchema(app, mssql, pool2) {
    app.get('/api/getuser', getUserDetails);

    app.get('/api/getuserpermissions', getUserPermissions);

    app.get('/api/getusers', getUsers);

    app.get('/api/getuserdetails', getUserDetails);

    app.post('/api/remove-user-permission', removeUserPermission);

    function getUserDetails(username, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.query("SELECT * FROM Users WHERE UserName='+username+'").then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "User retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        }).catch(err=>{
            console.log(err);
        })
    }

    function getUserPermissions(req, res){
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
    }

    function getUsers(req, res) {
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
    }

    function getUserDetails(req, res) {
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
    }

    function removeUserPermission(req, res){
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
    }

}
module.exports.loadSchema = createSchema;