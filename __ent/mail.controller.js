var nodemailer = require("nodemailer");
var fs = require("fs");
var handlebars = require("handlebars");
var async = require("async");
var ICS_URL = 'http://localhost:4200/';
var ICS_ADMIN_URL = "http://localhost:4200/login";
var transporter = nodemailer.createTransport({
  host: "mail.infinite-usa.com",
  port: 25,
  secure: false,
  // auth: {
  //     user: "sbhoybar@infinite-usa.com", // generated ethereal user
  //     pass: 'shriniwas@456' // generated ethereal password
  // },
  tls: {
    rejectUnauthorized: false
  }
});

var readHTMLFile = function (path, callback) {
  fs.readFile(path, { encoding: "utf-8" }, function (err, html) {
    if (err) {
      throw err;
      callback(err);
    } else {
      callback(null, html);
    }
  });
};

exports.sendMailAfterJobAdd = function (mssql, pool2, postedById, jobId) {
  console.log("==========Send Mail After Job Add==========");
  console.log(postedById);
  console.log(jobId);
  async.waterfall([
    function (callback) {
      getPostedByUserDetails(callback);
    },
    function (aResult, callback) {
      getJobDetails(callback, aResult);
    }
  ], function (err, aResult, bResult) {
    pool2.then(pool => {
      var request = pool.request();
      request
        .execute("sp_GetJobApproverUsers")
        .then(function (data) {
          mssql.close();
          var __o = data.recordset;
          var emailId = [];
          if (__o.length) {
            for (var i = 0; i < __o.length; i++) {
              console.log("Approve user");
              console.log(__o[i].UserId);
              console.log("posted by user");
              console.log(postedById)
              if (parseInt(__o[i].UserId) != parseInt(postedById)) {
                console.log("email user");
                emailId.push(__o[i].EmailAddress);
              }
            }
          }
          console.log(emailId);
          sendMailToApprovers(emailId, aResult, bResult);
        })
        .catch(function (err) {
          console.log(err);
        });
    });
  });
  function getPostedByUserDetails(callback) {
    pool2.then((pool) => {
      var request = pool.request();
      request.input('userId', mssql.Int, postedById);
      request.execute('sp_GetUserDetails').then(function (data, recordsets, returnValue, affected) {
        mssql.close();
        callback(null, data.recordset[0])
      }).catch(function (err) {
        console.log(err);
        res.send(err);
      });
    });
  }
  function getJobDetails(callback, aResult) {
    pool2.then(pool => {
      var request = pool.request();
      request.input("jobId", mssql.Int, jobId);
      request.execute("sp_GetJobDetailsByJobId").then(function (data) {
        mssql.close();
        callback(null, aResult, data.recordset[0]);
      })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }

  function sendMailToApprovers(emailId, a, b) {
    console.log("Recruiter Name");
    console.log(a.DisplayName);
    console.log("Job Title");
    console.log(b.JobTitle);
    readHTMLFile("./__mail_templates/job-created.html", function (err, html) {
      var template = handlebars.compile(html);
      var replacements = {
        recruiter: a.DisplayName,
        jobTitle: b.JobTitle,
        loginLink:ICS_ADMIN_URL
      };
      var htmlToSend = template(replacements);

      // setup email data with unicode symbols
      var mailOptions = {
        from: '"Infinite Computing Systems " <no-reply@infinite-usa.com>', // sender address
        to: emailId.join(","), // list of receivers
        subject: "Job Approval", // Subject line
        html: htmlToSend
      };
      console.log(mailOptions);
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        console.log("Mail Sent to: %s", emailId.join(","));
      });
    });
  };
};

exports.sendMailAfterApproveJob = function (mssql, pool2, jobId) {
  console.log("==========Send Mail After Approve Job==========");
  console.log(jobId);
  async.waterfall([
    function (callback) {
      getAllRecruiters(callback);
    },
    function (aResult, callback) {
      getJobDetails(callback, aResult);
    }
  ], function (err, aResult, bResult) {
    console.log(aResult);
    console.log(bResult);
    readHTMLFile("./__mail_templates/job-published.html", function (err, html) {
      var template = handlebars.compile(html);
      var replacements = {
        jobTitle: bResult.JobTitle,
        jobLink: ICS_URL + bResult.JobCustomTitle + "/" + bResult.jobId
      };
      var htmlToSend = template(replacements);

      // setup email data with unicode symbols
      var mailOptions = {
        from: '"Infinite Computing Systems " <no-reply@infinite-usa.com>', // sender address
        to: aResult.join(","), // list of receivers
        subject: "Job Published", // Subject line
        html: htmlToSend
      };
      console.log(mailOptions);
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        console.log("Mail Sent to: %s", emailId.join(","));
      });
    });
  });
  function getAllRecruiters(callback) {
    pool2.then((pool) => {
      var request = pool.request();
      request.execute('sp_GetRecruitersAndApprovers').then(function (data, recordsets, returnValue, affected) {
        mssql.close();
        var __o = data.recordset;
        var emailId = [];
        if (__o.length) {
          for (var i = 0; i < __o.length; i++) {
            console.log("email user");
            emailId.push(__o[i].EmailAddress);
          }
        }
        console.log(emailId);
        callback(null, emailId)
      }).catch(function (err) {
        console.log(err);
        res.send(err);
      });
    });
  }
  function getJobDetails(callback, aResult) {
    pool2.then(pool => {
      var request = pool.request();
      request.input("jobId", mssql.Int, jobId);
      request.execute("sp_GetJobDetailsByJobId").then(function (data) {
        mssql.close();
        callback(null, aResult, data.recordset[0]);
      })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }
};


exports.sendMailAfterApplicantsApplied = function (mssql, pool2, applicantId) {
  console.log("==========Send Mail After Applicant applied for Job==========");
  async.waterfall([
    function (callback) {
      getAllRecruiters(callback);
    },
    function (aResult, callback) {
      console.log("========");
      console.log(aResult);
      getApplicantDetails(callback, aResult);
    },
    function (aResult, bResult, callback) {
      getResumeOfApplicant(callback, aResult, bResult)
    }
  ], function (err, aResult, bResult, cResult) {
    console.log(aResult);
    console.log(bResult);
    console.log(cResult);
    if (typeof (bResult.AppliedForJob) != 'null') {
      pool2.then(pool => {
        var request = pool.request();
        request.input("jobId", mssql.Int, bResult.AppliedForJob);
        request.execute("sp_GetJobDetailsByJobId").then(function (data) {
          mssql.close();
          console.log(data.recordset[0]);
          sendMailToRecruiters(aResult, bResult, cResult, data.recordset[0]);
        }).catch(function (err) {
          console.log(err);
          res.send(err);
        });
      });
    } else {
      sendMailToRecruiters(aResult, bResult, cResult);
    }
  });

  function sendMailToRecruiters(aResult, bResult, cResult, jobDetails) {
    var tmplPath, replacements;
    if (typeof (jobDetails) != "undefined") {
      tmplPath = "./__mail_templates/resume-submission-forjob.html";
      replacements = {
        applicantName: bResult.Name,
        applicantEmail: bResult.EmailAddress,
        jobTitle: jobDetails.JobTitle
      };
    } else {
      tmplPath = "./__mail_templates/resume-submission-withoutjob.html";
      replacements = {
        applicantName: bResult.Name,
        applicantEmail: bResult.EmailAddress
      }
    }
    readHTMLFile(tmplPath, function (err, html) {
      var template = handlebars.compile(html);
      var htmlToSend = template(replacements);

      // setup email data with unicode symbols
      var mailOptions = {
        from: '"Infinite Computing Systems " <no-reply@infinite-usa.com>', // sender address
        to: aResult.join(","), // list of receivers
        subject: "New Resume Submission", // Subject line
        html: htmlToSend,
        attachments: [
          {   // utf-8 string as an attachment
            filename: cResult.FileName,
            path: './uploads/resumes/' + bResult.Id + "/" + cResult.FileName
          }
        ]
      };
      console.log(mailOptions);
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        console.log("Mail Sent to: %s", emailId.join(","));
      });
    });
  }

  function getResumeOfApplicant(callback, aResult, bResult) {
    pool2.then((pool) => {
      var request = pool.request();
      request.query('SELECT * FROM Resumes WHERE Id = ' + bResult.ResumeFileId).then(function (data, recordsets, returnValue, affected) {
        mssql.close();
        var cResult = data.recordset[0];
        console.log(cResult);
        callback(null, aResult, bResult, cResult)
      }).catch(function (err) {
        console.log(err);
        res.send(err);
      });
    });
  }
  function getAllRecruiters(callback) {
    pool2.then((pool) => {
      var request = pool.request();
      request.execute('sp_GetRecruitersAndApprovers').then(function (data, recordsets, returnValue, affected) {
        mssql.close();
        var __o = data.recordset;
        var emailId = [];
        if (__o.length) {
          for (var i = 0; i < __o.length; i++) {
            console.log("email user");
            emailId.push(__o[i].EmailAddress);
          }
        }
        console.log(emailId);
        callback(null, emailId)
      }).catch(function (err) {
        console.log(err);
        res.send(err);
      });
    });
  }

  function getApplicantDetails(callback, aResult) {
    pool2.then(pool => {
      var request = pool.request();
      request.query("SELECT * FROM Applicants WHERE Applicants.Id = " + applicantId).then(function (data) {
        mssql.close();
        console.log(data);
        callback(null, aResult, data.recordset[0]);
      })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }
};

exports.sendMailToApplicant = function (mssql, pool2, applicantId, jobId) {
  async.waterfall([
    function (callback) {
      getApplicantDetails(callback);
    },
    function (aResult, callback) {
      if (typeof (jobId) != "undefined") {
        pool2.then(pool => {
          var request = pool.request();
          request.query("SELECT * FROM Jobs INNER JOIN USERS ON USERS.Id = Jobs.PostedById WHERE Jobs.Id= " + jobId).then(function (data) {
            mssql.close();
            callback(null, aResult, data.recordset[0]);
          })
            .catch(function (err) {
              console.log(err);
              res.send(err);
            });
        });
      } else {
        callback(null, aResult);
      }
    }
  ], function (err, aResult, bResult) {
    console.log(aResult);
    console.log(bResult);
    triggerMailToApplicant(aResult, bResult);
  });

  function triggerMailToApplicant(aResult, bResult) {
    var tmplPath, replacements;
    if (typeof (bResult) != "undefined") {
      tmplPath = "./__mail_templates/recruiter-details-to-candidate.html";
      replacements = {
        applicantName: aResult.Name,
        recruiterName: bResult.DisplayName,
        recruiterEmail: bResult.EmailAddress
      };
    } else {
      tmplPath = "./__mail_templates/thankstoCandidate.html";
      replacements = {
        applicantName: aResult.Name
      }
    }
    readHTMLFile(tmplPath, function (err, html) {
      var template = handlebars.compile(html);
      var htmlToSend = template(replacements);

      // setup email data with unicode symbols
      var mailOptions = {
        from: '"Infinite Computing Systems " <no-reply@infinite-usa.com>', // sender address
        to: aResult.EmailAddress, // list of receivers
        subject: "Infinite Computing Systems : Thank you", // Subject line
        html: htmlToSend
      };
      console.log(mailOptions);
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        console.log("Mail Sent to: %s", emailId.join(","));
      });
    });
  }
  function getApplicantDetails(callback) {
    pool2.then(pool => {
      var request = pool.request();
      request.query("SELECT * FROM Applicants WHERE Applicants.Id = " + applicantId).then(function (data) {
        mssql.close();
        console.log(data);
        callback(null, data.recordset[0]);
      })
        .catch(function (err) {
          console.log(err);
          res.send(err);
        });
    });
  }
}
