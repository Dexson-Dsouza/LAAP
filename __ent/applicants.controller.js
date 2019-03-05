function createSchema(app, mssql, pool2) {

    var mailer = require("./mail.controller.js");

    app.get('/api/get-applicants', getApplicants);

    app.get('/api/get-applicant-status', getApplicantStatus);

    app.post('/api/add-applicant', addApplicant);

    app.post('/api/update-applicant-status', changeApplicantStatus);

    app.get('/api/getapplicantcomments', getApplicantComments);

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
            request.input('AppliedForJob', mssql.Int, req.body.AppliedForJob);
            request.execute('sp_GetApplicantAppliedCount').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                console.log("=============");
                console.log(data);
                console.log("=============");
                if (data.recordset.length) {
                    if (data.recordset[0].TotalAppliedForJob >= 1) {
                        console.log("//send error response that already applied");
                        res.send({ message: "Applicants already applied for this job", code: 40008, success: false, response: data.recordset[0] });
                    } else if (data.recordset[0].TotalApplied >= 8) {
                        console.log("//send error response maximum applied");
                        res.send({ message: "Applicants reached maximum attempts", code: 40009, success: false, response: data.recordset[0] });
                    } else {
                        console.log("New Applicant");
                        addApplicantToDatabase(req, res);
                    }
                } else {
                    console.log("New Applicant");
                    addApplicantToDatabase(req, res);
                }
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function addApplicantToDatabase(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.body);
            request.input('EmailAddress', mssql.VarChar(500), req.body.EmailAddress);
            request.input('ApplicantApplyDate', mssql.VarChar(500), req.body.ApplicantApplyDate);
            request.input('ResumeFileId', mssql.Int, req.body.ResumeFileId);
            if(typeof(req.body.AppliedForJob)!="undefined"){
                request.input('AppliedForJob', mssql.Int, req.body.AppliedForJob);
            }else{
                request.input('AppliedForJob', mssql.Int, 0);
            }            
            request.input('Name', mssql.VarChar(500), req.body.Name);
            request.input('ApplicantStatus', mssql.Int, req.body.ApplicantStatus);
            request.execute('sp_AddApplicant').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Applicants added successfully!", success: true, response: data.recordset[0] });
                mailer.sendMailToApplicant(data.recordset[0].Id, req.body.AppliedForJob);
                if (req.body.AppliedForJob) {
                    getCountsOfApplicantsOnJob(req.body.AppliedForJob);
                }
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getCountsOfApplicantsOnJob(jobId) {
        console.log("Checking How many applicants applied for Job.");
        pool2.then((pool) => {
            var request = pool.request();
            request.query('SELECT COUNT(*) AS TotalApplicantsOnJob FROM Applicants WHERE AppliedForJob = ' + jobId).then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                console.log("Total applicants applied for this job is : ", data.recordset[0].TotalApplicantsOnJob);
                if (data.recordset[0].TotalApplicantsOnJob && data.recordset[0].TotalApplicantsOnJob == 80) {
                    console.log("Total applicants applied for this job is : ", data.recordset[0].TotalApplicantsOnJob);
                    mailer.informRecruiterOnApplicantCountOnJob(jobId, data.recordset[0].TotalApplicantsOnJob)
                }
            }).catch(function (err) {
                console.log(err);
            });
        });
    }

    function changeApplicantStatus(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log('=====update status=====');
            console.log(req.body);
            request.input('applicantId', mssql.Int, req.body.applicantId);
            request.input('statusId', mssql.Int, req.body.statusId);
            request.input('note', mssql.VarChar(2000), req.body.note);
            request.input('statusUpdateDate', mssql.VarChar(500), req.body.statusUpdateDate);
            request.input('changedBy', mssql.Int, req.body.changedBy);
            request.execute('sp_UpdateApplicantStatus').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: 'Applicant Status updated successfully!', success: true });
                if (req.body.statusId == 11) {
                    console.log("applicant status changed to Irrelevant. Sending mail to applicant");
                    mailer.sendMailToIrrelevantApplicant(req.body.applicantId, req.body.jobId);
                }
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getApplicantStatus(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.query);
            request.query('SELECT * FROM ApplicantStatus').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Applicants Status rerived successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getApplicantComments(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.input('ApplicantId', mssql.Int, req.query.ApplicantId);
            request.execute('sp_GetApplicantComments').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Applicants Comments rerived successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }
}
module.exports.loadSchema = createSchema;