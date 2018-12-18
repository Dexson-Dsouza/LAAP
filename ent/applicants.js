function createSchema(app, mssql, pool2) {
    app.get('/api/get-applicants', (req, res) => {
        getApplicants(req, res);
    });

    function getApplicants(req, res){
        pool2.then((pool) => {
            var request = pool.request();
            request.input('page', mssql.Int, req.params.page);
            request.input('limit', mssql.Int, req.params.limit);
            request.input('jobId', mssql.Int, req.params.jobId);
            request.execute('sp_getApplicants').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }
}
module.exports.loadSchema = createSchema;