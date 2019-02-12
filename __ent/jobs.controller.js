function createSchema(app, mssql, pool2) {
  var jwtToken = require("./jwt.controller");

  var mailer = require("./mail.controller.js");

  app.get("/api/getJobsList/:page/:limit", getJobList);

  app.get("/api/getJobsDetails/:jobId", getJobDetails);

  app.get("/api/getlocations", getLocation);

  app.get("/api/searchjobs", searchJobsByAllParams);

  app.get("/api/getcategories", getAllJobCategories);

  app.get("/api/getJobsForRecruiter", getJobForRecruiters);

  app.get("/api/getjobtypes", getJobTypes);

  app.post("/api/add-job", addJob);

  app.get("/api/gettopjob", getTopJob);

  app.post("/api/update-job", updateJob);

  app.get("/api/getjobstatus", getJobStatus);

  app.post("/api/update-job-status", updateJobStatus);

  app.post("/api/addcategory", addCategory);

  app.get('/api/getshifts', getShifts);

  app.get('/api/getcurrencies', getCurrencies);

  app.post('/api/addlocation', addLocation);

  app.get("/api/mail", function () {
    // mailer.sendMailAfterApplicantsApplied(mssql, pool2, 925);
  });

  var invalidRequestError = {
    name: "INVALID_REQUEST",
    code: "50079",
    msg: "your request has been rejected due to invalid request parameters"
  };

  function getJobList(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request.input("page", mssql.Int, req.params.page);
      request.input("limit", mssql.Int, req.params.limit);
      request
        .execute("sp_GetJobsByPagination")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function getJobDetails(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request.input("jobId", mssql.Int, req.params.jobId);
      request
        .execute("sp_GetJobDetailsByJobId")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset[0]
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function getLocation(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request
        .query("SELECT * FROM Location")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function getJobsByLocation(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request.input("page", mssql.Int, req.params.page);
      request.input("limit", mssql.Int, req.params.limit);
      request.input("locationId", mssql.Int, req.params.locationId);
      request
        .execute("sp_SearchJobsByLocationIdPagination")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function getJobsByJobtitle(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request.input("page", mssql.Int, req.params.page);
      request.input("limit", mssql.Int, req.params.limit);
      request.input("str", mssql.VarChar(100), req.params.str);
      request
        .execute("sp_SearchJobsByTextPagination")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function searchJobsByAllParams(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      console.log(req.query);
      request.input("page", mssql.Int, req.query.page);
      request.input("limit", mssql.Int, req.query.limit);
      request.input("loc", mssql.Int, req.query.loc);
      request.input("str", mssql.VarChar(100), req.query.str);
      request.input("category", mssql.Int, req.query.category);
      request.input("categoryStr", mssql.VarChar(100), req.query.categoryStr);
      request.input("jobStatus", mssql.Int, req.query.jobStatus);
      request
        .execute("sp_SearchJobsByAllSearchBox")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function getAllJobCategories(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request
        .query("SELECT * FROM JobCategory")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function getJobForRecruiters(req, res) {
    // jwtToken.verifyRequest(req, res, (decodedToken) => {
    //     console.log(decodedToken.email);
    // })
    pool2.then(pool => {
      var request = pool.request();
      console.log(req.query);
      request.input("page", mssql.Int, req.query.page);
      request.input("limit", mssql.Int, req.query.limit);
      request.input("jobCTitle", mssql.VarChar(100), req.query.jobCTitle);
      request.input("loc", mssql.Int, req.query.loc);
      request.input("category", mssql.Int, req.query.category);
      request.input("postedById", mssql.Int, req.query.postedById);
      request.input("jobStatus", mssql.Int, req.query.jobStatus);
      request
        .execute("sp_SearchJobsForRecruiter")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function addJob(req, res) {
    jwtToken.verifyRequest(req, res, decodedToken => {
      console.log(decodedToken.email);
      if (decodedToken.email) {
        pool2.then(pool => {
          var request = pool.request();
          console.log(req.body);
          request.input("postedBy", mssql.Int, parseInt(req.body.postedBy));
          request.input("jobType", mssql.Int, parseInt(req.body.jobType));
          request.input(
            "jobCategoryId",
            mssql.Int,
            parseInt(req.body.jobCategoryId)
          );
          request.input(
            "jobCompanyId",
            mssql.Int,
            parseInt(req.body.jobCompanyId)
          );
          request.input("jobTitle", mssql.VarChar(500), req.body.jobTitle);
          request.input(
            "jobCustomTitle",
            mssql.VarChar(100),
            req.body.jobCustomTitle
          );
          request.input(
            "jobDescription",
            mssql.VarChar(mssql.MAX),
            req.body.jobDescription
          );
          request.input(
            "numberOfPos",
            mssql.Int,
            parseInt(req.body.numberOfPos)
          );
          request.input(
            "jobLocationId",
            mssql.Int,
            parseInt(req.body.jobLocationId)
          );
          request.input("expDate", mssql.VarChar(100), req.body.expDate);
          request.input(
            "requiredEducation",
            mssql.VarChar(mssql.MAX),
            req.body.requiredEducation
          );
          request.input(
            "requiredExperience",
            mssql.VarChar(mssql.MAX),
            req.body.requiredExperience
          );
          request.input(
            "requiredSkills",
            mssql.VarChar(mssql.MAX),
            req.body.requiredSkills
          );
          request.input(
            "jobPostedDate",
            mssql.VarChar(100),
            req.body.jobPostedDate
          );
          request.input("jobStatus", mssql.Int, parseInt(req.body.jobStatus));
          request.input("jobTravel", mssql.Int, parseInt(req.body.jobTravel));
          request.input(
            "jobTravelDetails",
            mssql.VarChar(2000),
            req.body.jobTravelDetails
          );
          request.input(
            "jobStatusUpdatedBy",
            mssql.Int,
            req.body.jobStatusUpdatedBy
          );
          request.input("salary", mssql.Int, parseInt(req.body.salary));
          request.input("shift", mssql.Int, req.body.shift);
          if (req.body.salary) {
            request.input("salaryCurrency", mssql.Int, req.body.salaryCurrency);
          }
          request.input('remark', mssql.VarChar(4000), req.body.remark);
          request
            .execute("sp_AddJob")
            .then(function (data, recordsets, returnValue, affected) {
              mssql.close();
              res.send({
                message: "Job added successfully!",
                success: true,
                response: data.recordset
              });
              mailer.sendMailAfterJobAdd(req.body.postedBy, data.recordset[0].Id);
            })
            .catch(function (err) {
              console.log(err);
              res.send(err);
            });
        });
      } else {
        res.status("401");
        res.send(invalidRequestError);
      }
    });
  }

  function getJobTypes(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request
        .query("SELECT * FROM JobType")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function getTopJob(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request
        .query("SELECT TOP 1 * FROM Jobs ORDER BY Id DESC")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset[0]
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function updateJob(req, res) {
    jwtToken.verifyRequest(req, res, decodedToken => {
      console.log(decodedToken.email);
      if (decodedToken.email) {
        pool2.then(pool => {
          var request = pool.request();
          console.log(req.body);
          // request.input('postedBy', mssql.Int, parseInt(req.body.postedBy));
          request.input("jobId", mssql.Int, parseInt(req.body.jobId));
          request.input("jobType", mssql.Int, parseInt(req.body.jobType));
          request.input(
            "jobCategoryId",
            mssql.Int,
            parseInt(req.body.jobCategoryId)
          );
          // request.input('jobCompanyId', mssql.Int, parseInt(req.body.jobCompanyId));
          request.input("jobTitle", mssql.VarChar(500), req.body.jobTitle);
          request.input(
            "jobCustomTitle",
            mssql.VarChar(100),
            req.body.jobCustomTitle
          );
          request.input(
            "jobDescription",
            mssql.VarChar(mssql.MAX),
            req.body.jobDescription
          );
          request.input(
            "numberOfPos",
            mssql.Int,
            parseInt(req.body.numberOfPos)
          );
          request.input(
            "jobLocationId",
            mssql.Int,
            parseInt(req.body.jobLocationId)
          );
          request.input("expDate", mssql.VarChar(100), req.body.expDate);
          request.input(
            "requiredEducation",
            mssql.VarChar(mssql.MAX),
            req.body.requiredEducation
          );
          request.input(
            "requiredExperience",
            mssql.VarChar(mssql.MAX),
            req.body.requiredExperience
          );
          request.input(
            "requiredSkills",
            mssql.VarChar(mssql.MAX),
            req.body.requiredSkills
          );
          // request.input('jobPostedDate', mssql.VarChar(100), req.body.jobPostedDate);
          // request.input('jobStatus', mssql.Int, parseInt(req.body.jobStatus));
          request.input("jobTravel", mssql.Int, parseInt(req.body.jobTravel));
          request.input(
            "jobTravelDetails",
            mssql.VarChar(2000),
            req.body.jobTravelDetails
          );
          // request.input('jobStatusUpdatedBy', mssql.Int, req.body.jobStatusUpdatedBy);
          request.input("salary", mssql.Int, parseInt(req.body.salary));
          request.input("shift", mssql.Int, req.body.shift);
          if (req.body.salary) {
            request.input("salaryCurrency", mssql.Int, req.body.salaryCurrency);
          }
          request.input('remark', mssql.VarChar(4000), req.body.remark);
          request
            .execute("sp_UpdateJob")
            .then(function (data, recordsets, returnValue, affected) {
              mssql.close();
              res.send({
                message: "Job updated successfully!",
                success: true,
                response: data.recordset
              });
            })
            .catch(function (err) {
              console.log(err);
              res.send(err);
            });
        });
      } else {
        res.status("401");
        res.send(invalidRequestError);
      }
    });
  }

  function getJobStatus(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      request
        .query("SELECT * FROM JobStatus")
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Data retrieved successfully!",
            success: true,
            response: data.recordset
          });
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function updateJobStatus(req, res) {
    pool2.then(pool => {
      var request = pool.request();
      console.log(req.body);
      var status = req.body.status;
      var jobId = req.body.jobId;
      request
        .query("UPDATE Jobs SET JobStatus=" + status + " WHERE Id=" + jobId)
        .then(function (data, recordsets, returnValue, affected) {
          mssql.close();
          res.send({
            message: "Job Status updated successfully!",
            success: true
          });
          if (status == 1) {
            mailer.sendMailAfterApproveJob(jobId);
          }
        })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function addCategory(req, res) {
    pool2.then((pool) => {
      var request = pool.request();
      console.log(req.body);
      request.input('category', mssql.VarChar(1000), parseInt(req.body.category));
      var cat = req.body.category;
      var catNicename = cat.replace(/\s+/g, '-').toLowerCase();
      request.query("INSERT INTO JobCategory(JobCategoryNicename,JobCategory) VALUES ('" + catNicename + "','" + cat + "')").then(function (data, recordsets, returnValue, affected) {
        mssql.close();
        res.send({ message: "Category added successfully!", success: true, response: data.recordset });
      }).catch(function (err) {
        console.log(err);
        res.send(err);
      });
    });
  }

  function getShifts(req, res) {
    pool2.then((pool) => {
      var request = pool.request();
      request.query("SELECT * FROM Shift").then(function (data, recordsets, returnValue, affected) {
        mssql.close();
        res.send({ message: "Shifts retrived successfully!", success: true, response: data.recordset });
      }).catch(function (err) {
        console.log(err);
        res.send(err);
      });
    });
  }

  function getCurrencies(req, res) {
    pool2.then((pool) => {
      var request = pool.request();
      request.query("SELECT * FROM Currency").then(function (data, recordsets, returnValue, affected) {
        mssql.close();
        res.send({ message: "Currency retrived successfully!", success: true, response: data.recordset });
      }).catch(function (err) {
        console.log(err);
        res.send(err);
      });
    });
  }

  function addLocation(req, res) {
    pool2.then((pool) => {
      var request = pool.request();
      console.log(req.body);
      request.input('StreetAddress', mssql.VarChar(500), req.body.StreetAddress);
      request.input('City', mssql.VarChar(50), req.body.City);
      request.input('State', mssql.VarChar(50), req.body.State);
      request.input('Country', mssql.VarChar(50), req.body.Country);
      request.input('Zipcode', mssql.VarChar(50), req.body.Zipcode);
      request.input('Lat', mssql.VarChar(500), req.body.Lat);
      request.input('Long', mssql.VarChar(500), req.body.Long);
      request.execute('sp_AddLocation').then(function (data, recordsets, returnValue, affected) {
        mssql.close();
        console.log(data);
        res.send({ message: "Location added successfully!", success: true});
      }).catch(function (err) {
        console.log(err);
        res.send(err);
      });
    });
  }
}
module.exports.loadSchema = createSchema;
