function createSchema(app, mssql, pool2) {

    app.get('/api/getpermissions', getPermissions);

    app.post('/api/addpermissions', addUpdateUserPermission);

    function getPermissions(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.query('SELECT * FROM Permission').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Permissions retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function addUpdateUserPermission(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.body);
            request.input('UserId', mssql.Int, parseInt(req.body.UserId));
            request.input('PermissionId', mssql.Int, parseInt(req.body.PermissionId));
            request.execute('sp_AddUpdateUserPermission').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "User permission updated successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

}
module.exports.loadSchema = createSchema;