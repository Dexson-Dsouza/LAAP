function createSchema(app, mssql, pool2) {
    app.get('/api/get-applicants', getApplicants);

    app.post('/api/add-applicant', addApplicant)

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

    function addApplicant(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.body);
            request.input('EmailAddress', mssql.VarChar(500), req.body.EmailAddress);
            request.input('ApplicantApplyDate', mssql.VarChar(500), req.body.ApplicantApplyDate);
            request.input('ResumeFileId', mssql.Int, req.body.ResumeFileId);
            request.input('AppliedForJob', mssql.Int, req.body.AppliedForJob);
            request.input('Name', mssql.VarChar(500), req.body.Name);
            request.input('ApplicantStatus', mssql.Int, req.body.ApplicantStatus);
            request.execute('sp_AddApplicant').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Applicants added successfully!", success: true, response: data.recordset[0] });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }
}
module.exports.loadSchema = createSchema;