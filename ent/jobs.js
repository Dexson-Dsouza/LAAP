function createSchema(app, mssql, pool2) {
    app.get('/api/getJobsList/:page/:limit', (req, res) => {
        getJobList(req, res);
    });

    app.get('/api/getJobsDetails/:jobId', (req, res) => {
        getJobDetails(req, res);
    });

    app.get('/api/getlocations', (req, res) => {
        getLocation(req, res);
    });

    app.get('/api/searchjobs', (req, res) => {
        searchJobsByAllParams(req, res);
    })

    app.get('/api/getcategories', (req, res) => {
        getAllJobCategories(req, res);
    });

    app.get('/api/getJobsForRecruiter', (req, res) => {
        getJobForRecruiters(req, res);
    });

    app.get('/api/add-job', (req, res) => {
        addJob(req, res);
    });

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

    function addJob(req, res){
        
    }
}
module.exports.loadSchema = createSchema;