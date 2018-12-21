function createSchema(app, mssql, pool2) {
    var jwtToken = require("./jwt.controller");
    app.get('/api/getJobsList/:page/:limit', getJobList);

    app.get('/api/getJobsDetails/:jobId', getJobDetails);

    app.get('/api/getlocations', getLocation);

    app.get('/api/searchjobs', searchJobsByAllParams)

    app.get('/api/getcategories', getAllJobCategories);

    app.get('/api/getJobsForRecruiter', getJobForRecruiters);

    app.get('/api/getjobtypes', getJobTypes);

    app.post('/api/add-job', addJob);

    app.get('/api/gettopjob', getTopJob);

    app.post('/api/update-job', updateJob);

    var invalidRequestError = {
        "name": "INVALID_REQUEST",
        "code": "50079",
        "msg": "your request has been rejected due to invalid request parameters"
    };

    function getJobList(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.input('page', mssql.Int, req.params.page);
            request.input('limit', mssql.Int, req.params.limit);
            request.execute('sp_GetJobsByPagination').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getJobDetails(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.input('jobId', mssql.Int, req.params.jobId);
            request.execute('sp_GetJobDetailsByJobId').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset[0] });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getLocation(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.query('SELECT * FROM Location').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getJobsByLocation(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.input('page', mssql.Int, req.params.page);
            request.input('limit', mssql.Int, req.params.limit);
            request.input('locationId', mssql.Int, req.params.locationId);
            request.execute('sp_SearchJobsByLocationIdPagination').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getJobsByJobtitle(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.input('page', mssql.Int, req.params.page);
            request.input('limit', mssql.Int, req.params.limit);
            request.input('str', mssql.VarChar(100), req.params.str);
            request.execute('sp_SearchJobsByTextPagination').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function searchJobsByAllParams(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.query);
            request.input('page', mssql.Int, req.query.page);
            request.input('limit', mssql.Int, req.query.limit);
            request.input('loc', mssql.Int, req.query.loc);
            request.input('str', mssql.VarChar(100), req.query.str);
            request.input('category', mssql.Int, req.query.category);
            request.input('categoryStr', mssql.VarChar(100), req.query.categoryStr);
            request.execute('sp_SearchJobsByAllSearchBox').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getAllJobCategories(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.query('SELECT * FROM JobCategory').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getJobForRecruiters(req, res) {
        // jwtToken.verifyRequest(req, res, (decodedToken) => {
        //     console.log(decodedToken.email);
        // })
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.query);
            request.input('page', mssql.Int, req.query.page);
            request.input('limit', mssql.Int, req.query.limit);
            request.input('jobCTitle', mssql.Int, req.query.jobCTitle);
            request.input('loc', mssql.Int, req.query.loc);
            request.input('category', mssql.Int, req.query.category);
            request.input('categoryStr', mssql.VarChar(100), req.query.categoryStr);
            request.execute('sp_SearchJobsForRecruiter').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function addJob(req, res) {
        jwtToken.verifyRequest(req, res, (decodedToken) => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    request.input('postedBy', mssql.Int, parseInt(req.body.postedBy));
                    request.input('jobType', mssql.Int, parseInt(req.body.jobType));
                    request.input('jobCategoryId', mssql.Int, parseInt(req.body.jobCategoryId));
                    request.input('jobCompanyId', mssql.Int, parseInt(req.body.jobCompanyId));
                    request.input('jobTitle', mssql.VarChar(500), req.body.jobTitle);
                    request.input('jobCustomTitle', mssql.VarChar(100), req.body.jobCustomTitle);
                    request.input('jobDescription', mssql.VarChar(mssql.MAX), req.body.jobDescription);
                    request.input('numberOfPos', mssql.Int, parseInt(req.body.numberOfPos));
                    request.input('jobLocationId', mssql.Int, parseInt(req.body.jobLocationId));
                    request.input('expDate', mssql.VarChar(100), req.body.expDate);
                    request.input('requiredEducation', mssql.VarChar(mssql.MAX), req.body.requiredEducation);
                    request.input('requiredExperience', mssql.VarChar(mssql.MAX), req.body.requiredExperience);
                    request.input('requiredSkills', mssql.VarChar(mssql.MAX), req.body.requiredSkills);
                    request.input('jobPostedDate', mssql.VarChar(100), req.body.jobPostedDate);
                    request.input('jobStatus', mssql.Int, parseInt(req.body.jobStatus));
                    request.input('jobTravel', mssql.Int, parseInt(req.body.jobTravel));
                    request.input('jobTravelDetails', mssql.VarChar(2000), req.body.jobTravelDetails);
                    request.input('jobStatusUpdatedBy', mssql.Int, req.body.jobStatusUpdatedBy);
                    request.input('salary', mssql.Int, parseInt(req.body.salary));
                    request.input('shift', mssql.VarChar(100), req.body.shift);
                    request.execute('sp_AddJob').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Job added successfully!", success: true, response: data.recordset });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });

                });
            } else {
                res.status("401");
                res.send(invalidRequestError);
            }
        })
    }

    function getJobTypes(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.query('SELECT * FROM JobType').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getTopJob(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            request.query('SELECT TOP 1 * FROM Jobs ORDER BY Id DESC').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Data retrieved successfully!", success: true, response: data.recordset[0] });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function updateJob(req, res){
        jwtToken.verifyRequest(req, res, (decodedToken) => {
            console.log(decodedToken.email);
            if (decodedToken.email) {
                pool2.then((pool) => {
                    var request = pool.request();
                    console.log(req.body);
                    // request.input('postedBy', mssql.Int, parseInt(req.body.postedBy));
                    request.input('jobId', mssql.Int, parseInt(req.body.jobId));
                    request.input('jobType', mssql.Int, parseInt(req.body.jobType));
                    request.input('jobCategoryId', mssql.Int, parseInt(req.body.jobCategoryId));
                    // request.input('jobCompanyId', mssql.Int, parseInt(req.body.jobCompanyId));
                    request.input('jobTitle', mssql.VarChar(500), req.body.jobTitle);
                    request.input('jobCustomTitle', mssql.VarChar(100), req.body.jobCustomTitle);
                    request.input('jobDescription', mssql.VarChar(mssql.MAX), req.body.jobDescription);
                    request.input('numberOfPos', mssql.Int, parseInt(req.body.numberOfPos));
                    request.input('jobLocationId', mssql.Int, parseInt(req.body.jobLocationId));
                    request.input('expDate', mssql.VarChar(100), req.body.expDate);
                    request.input('requiredEducation', mssql.VarChar(mssql.MAX), req.body.requiredEducation);
                    request.input('requiredExperience', mssql.VarChar(mssql.MAX), req.body.requiredExperience);
                    request.input('requiredSkills', mssql.VarChar(mssql.MAX), req.body.requiredSkills);
                    // request.input('jobPostedDate', mssql.VarChar(100), req.body.jobPostedDate);
                    // request.input('jobStatus', mssql.Int, parseInt(req.body.jobStatus));
                    request.input('jobTravel', mssql.Int, parseInt(req.body.jobTravel));
                    request.input('jobTravelDetails', mssql.VarChar(2000), req.body.jobTravelDetails);
                    // request.input('jobStatusUpdatedBy', mssql.Int, req.body.jobStatusUpdatedBy);
                    request.input('salary', mssql.Int, parseInt(req.body.salary));
                    request.input('shift', mssql.VarChar(100), req.body.shift);
                    request.execute('sp_UpdateJob').then(function (data, recordsets, returnValue, affected) {
                        mssql.close();
                        res.send({ message: "Job updated successfully!", success: true, response: data.recordset });
                    }).catch(function (err) {
                        console.log(err);
                        res.send(err);
                    });

                });
            } else {
                res.status("401");
                res.send(invalidRequestError);
            }
        })
    }
}
module.exports.loadSchema = createSchema;