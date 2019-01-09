function createSchema(app, mssql, pool2) {
    app.get('/api/companycenters', getCompanyCenters);

    function getCompanyCenters(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.execute('sp_GetCompanyCenters').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Company Centers retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }
}
module.exports.loadSchema = createSchema;