function createSchema(app, mssql, pool2) {
    app.get('/api/getuser', getUserDetails);

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
        });
    }
}
module.exports.loadSchema = createSchema;