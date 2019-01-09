function createSchema(app, mssql, pool2) {

    app.post('/api/add-comment-onjob', addCommentOnJob);

    app.get('/api/getcommentsforjob', getAllCommentsForJob);
    
    function addCommentOnJob(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.body);
            request.input('Comment', mssql.VarChar(1000), req.body.Comment);
            request.input('UserId', mssql.Int, req.body.UserId);
            request.input('JobId', mssql.Int, req.body.JobId);
            request.input('CommentedDate', mssql.VarChar(500), req.body.CommentedDate);
            request.input('IsDeleted', mssql.Int, req.body.IsDeleted);
            request.execute('sp_AddCommentOnJob').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Comment added successfully!", success: true, response: data.recordset[0] });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function getAllCommentsForJob(req, res) {
        pool2.then((pool) => {
            var request = pool.request();
            console.log(req.query);
            request.input('jobId', mssql.Int, req.query.jobId);
            request.execute('sp_getCommentsForJob').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                res.send({ message: "Comments retrieved successfully!", success: true, response: data.recordset });
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }
}
module.exports.loadSchema = createSchema;