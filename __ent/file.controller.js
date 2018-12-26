function createSchema(app, mssql, pool2, fs) {
    let upload = require('./multer.config.js');

    app.post('/api/file/upload/:applicantId', upload.single("file"), uploadFile);

    app.get('/api/file/all', listUrlFiles);

    app.get('/api/file/:filename', downloadFile);

    function uploadFile(req, res) {
        console.log("uploadFileCalled");
        console.log(req.params);
        if (!req.file) {
            console.log("No file received");
            res.send({
                success: false
            });
        } else {
            var filename = req.file.originalname;
            console.log(req.file);
            console.log('file received');
            var tmpPath = "./uploads/tmpDir/" + req.file.originalname;
            var newDir = "./uploads/resumes/" + req.params.applicantId;
            if (!fs.existsSync(newDir)) {
                fs.mkdirSync(newDir);
                fs.move(tmpPath, newDir + "/" + req.file.originalname, function (err) {
                    if (err) throw err
                    console.log('File Uploaded Successfully renamed - AKA moved!');
                    addFileToDatabase(res, req.file.originalname, req.params.applicantId);
                })
            }
        }
    }

    function addFileToDatabase(res, newFile, applicantId) {
        console.log("File added to database called");
        pool2.then((pool) => {
            console.log(newFile);
            console.log(applicantId);
            var request = pool.request();
            request.input('FileName', mssql.VarChar(500), newFile);
            request.input('FileType', mssql.Int, 1);
            request.input('FileExtension', mssql.VarChar(100), newFile.split(".")[1]);
            request.input('FilePath', mssql.VarChar(2000), newFile);
            request.input('FileUploadDate', mssql.VarChar(500), getDate());
            request.execute('sp_AddResume').then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                console.log("File added to database successfully");
                console.log(JSON.stringify(data));
                updateResumeOfApplicant(res, data.recordset[0].Id, applicantId)
            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function twoDigits(d) {
        if (0 <= d && d < 10) return "0" + d.toString();
        if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
        return d.toString();
    }

    function getDate() {
        return new Date().getUTCFullYear() + "-" + twoDigits(1 + new Date().getUTCMonth()) + "-" + twoDigits(new Date().getUTCDate()) + " " + twoDigits(new Date().getUTCHours()) + ":" + twoDigits(new Date().getUTCMinutes()) + ":" + twoDigits(new Date().getUTCSeconds());
    }
    function updateResumeOfApplicant(res, resumeId, applicantId) {
        console.log("UpdateResumeOfApplicant called");
        pool2.then((pool) => {
            var request = pool.request();

            request.query('UPDATE Applicants SET ResumeFileId=' + resumeId + " WHERE Id=" + applicantId).then(function (data, recordsets, returnValue, affected) {
                mssql.close();
                console.log("FileId Updated for applicant id");
                console.log("File uploaded successfully!");
                res.send({ message: 'File uploaded successfully!', success: true });

            }).catch(function (err) {
                console.log(err);
                res.send(err);
            });
        });
    }

    function listUrlFiles(req, res) {
        fs.readdir("./uploads/tmpDir/", (err, files) => {
            for (let i = 0; i < files.length; ++i) {
                files[i] = "http://localhost:8080/api/file/" + files[i];
            }

            res.send(files);
        })
    }

    function downloadFile(req, res) {
        let filename = req.params.filename;
        res.download(uploadFolder + filename);
    }
}
module.exports.loadSchema = createSchema;