function createSchema(app, mssql, pool2) {
    app.get('/api/get-applicants', (req, res) => {
        getApplicants(req, res);
    });

    function getApplicants(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.query);
            request.input('page', mssql.Int, req.query.page);
            request.input('limit', mssql.Int, req.query.limit);
            request.input('jobId', mssql.Int, req.query.jobId);
            request.input('jobTitle', mssql.VarChar(100), req.query.jobTitle);
            request.input('applicantName', mssql.VarChar(100), req.query.applicantName);
            request.input('category', mssql.Int, req.query.category);
            request.execute('sp_getApplicants').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Applicants retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }
}
module.exports.loadSchema = createSchema;