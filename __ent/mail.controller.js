var nodemailer = require("nodemailer");
var fs = require("fs");
var handlebars = require("handlebars");
var async = require("async");
var ICS_URL = 'http://careers.infinite-usa.com';
var ICS_ADMIN_URL = "http://admin.infinite-usa.com";
var transporter = nodemailer.createTransport({
  host: "mail.infinite-usa.com",
  port: 25,
  secure: false,
  tls: {
    rejectUnauthorized: false
  }
});

var thisapp, thismssql, thispool2;
function createSchema(thisapp, thismssql, thispool2) {
  app = thisapp;
  mssql = thismssql;
  pool2 = thispool2;

  app.get('/api/sendmailtoirrelevantapplicant', sendMailToIrrelevantApplicant);

  app.post('/api/sdmonaddcommentonjob', sendMailAfterCommentAddedOnJob);
}

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

/*
**THis function send mail to the approvers that
**new job is added, pls review and publish it
*/
function sendMailAfterJobAdd(postedById, jobId) {
  console.log("==========Send Mail After Job Add==========");
  console.log(postedById);
  console.log(jobId);
  async.series([
    function (callback) {
      getPostedByUserDetails(callback, postedById);
    },
    function (callback) {
      getJobDetails(callback, jobId);
    },
    function (callback) {
      getJobApprovers(callback, postedById);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];
    var cResult = results[2];
    var replacements = {
      recruiter: aResult.DisplayName,
      jobTitle: bResult.JobTitle,
      loginLink: ICS_ADMIN_URL + "/dashboard/approve-job",
      jobCustomTitle: bResult.JobCustomTitle
    };
    triggerMail("job-created.html", replacements, cResult.join(","), "Job Approval");
  });
};

/*
**THis function send mail to the approvers that
**new job is added, pls review and publish it
*/
function sendMailAfterUpdateJob(updatedBy, jobId) {
  console.log("==========Send Mail After Job Add==========");
  console.log(updatedBy);
  console.log(jobId);
  async.series([
    function (callback) {
      getPostedByUserDetails(callback, updatedBy);
    },
    function (callback) {
      getJobDetails(callback, jobId);
    },
    function (callback) {
      getJobApprovers(callback, updatedBy);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];
    var cResult = results[2];
    var replacements = {
      recruiter: aResult.DisplayName,
      jobTitle: bResult.JobTitle,
      loginLink: ICS_ADMIN_URL+"/dashboard/jobs",
      jobCustomTitle: bResult.JobCustomTitle
    };
    triggerMail("job-update.html", replacements, cResult.join(","), "Job Updated");
  });
};


/*
**THis function send mail to the approvers/recruiter that
**new job is published.
*/
function sendMailAfterApproveJob(jobId) {
  console.log("==========Send Mail After Approve Job==========");
  console.log(jobId);
  async.series([
    function (callback) {
      getAllRecruiters(callback);
    },
    function (callback) {
      getJobDetails(callback, jobId);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];
    var replacements = {
      jobTitle: bResult.JobTitle,
      jobLink: ICS_URL + "/job/" + bResult.JobCustomTitle + "/" + bResult.jobId
    };
    triggerMail("job-published.html", replacements, aResult.join(","), "New Job Published");
  });
};

/*
**THis function send mail to the approvers/recruiter that
**new new applicant submitted his resume.
*/
function sendMailAfterApplicantsApplied(applicantId) {
  console.log("==========Send Mail After Applicant applied for Job==========");
  async.series([
    function (callback) {
      getAllRecruitersAndReportingPersons(callback);
    },
    function (callback) {
      getApplicantWithResume(callback, applicantId);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];

    if (typeof (bResult.AppliedForJob) != 'null') {
      pool2.then(pool => {
        var request = pool.request();
        request.input("jobId", mssql.Int, bResult.AppliedForJob);
        request.execute("sp_GetJobDetailsByJobId").then(function (data) {
          mssql.close();
          console.log(data.recordset[0]);
          sendMailToRecruiters(aResult, bResult, data.recordset[0]);
        }).catch(function (err) {
          console.log(err);
          res.send(err);
        });
      });
    } else {
      sendMailToRecruiters(aResult, bResult);
    }
  });
};

/*
**THis function send mail to the applicant
*/
function sendMailToApplicant(applicantId, jobId) {
  async.series([
    function (callback) {
      if (typeof (jobId) != "undefined") {
        getJobDetailsWithRecruiter(callback, jobId);
      } else {
        var c;
        callback(null, c);
      }
    },
    function (callback) {
      getApplicantDetails(callback, applicantId);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];
    triggerMailToApplicant(aResult, bResult);
  });
}

/*
**THis function send mail to the applicant which
**are irrelevant with the current vacancies.
*/
function sendMailToIrrelevantApplicant(applicantId, jobId) {
  console.log("Job Id ", jobId);
  async.series([
    function (callback) {
      getApplicantDetails(callback, applicantId)
    }
  ], function (err, results) {
    var applicantDetails = results[0];
    var tmplPath = "irrelevantjobapplication.html", subject;
    var replacements = {
      applicantName: applicantDetails.Name
    }
    if (typeof (jobId) != "undefined") {
      subject = 'Update on your Application Status!';
    } else {
      subject = 'Update on your Candidature!'
    }
    console.log(applicantDetails.EmailAddress);
    console.log("Mail sending to the applicant: ", applicantDetails.EmailAddress);
    console.log("Content: ", replacements);
    triggerMail(tmplPath, replacements, applicantDetails.EmailAddress, subject);
  });
}

/*
**THis function send mail to the after comment added on job
*/
function sendMailAfterCommentAddedOnJob(req, res) {
  console.log(req.body);
  var commentId = req.body.commentId;
  var c = req.body.emails;
  var emails = c.split(",");
  var jobTitle = req.body.jobTitle;
  async.series([
    function (callback) {
      getCommentDetails(callback, commentId);
    }
  ], function (err, results) {
    var aResult = results[0];
    console.log(emails);
    res.send({ success: true, message: "mail sent" });
    triggerMailOnCommentAddedOnJob(aResult, emails, jobTitle);
  });
}

/*
**THis function send mail to the approvers/recruiter that
**new new applicant submitted his resume.
*/
function informRecruiterOnApplicantCountOnJob(jobId, applicantCount) {
  console.log("==========Send Mail After Applicants Count Limit Reached On Job==========");
  async.series([
    function (callback) {
      getAllRecruiters(callback);
    },
    function (callback) {
      getJobDetails(callback, jobId);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];

    var tmplPath = "applicantcountreached.html", subject;
    var replacements = {
      jobTitle: bResult.JobTitle,
      jobCustomTitle: bResult.JobCustomTitle,
      applicantCount: applicantCount
    }
    subject = 'High applications on ' + bResult.JobTitle + "!";
    triggerMail(tmplPath, replacements, aResult.join(","), subject);
  });
};
/*
**Pass job id anc callback to this function to
**GetJobDetails by job id
*/
function getJobDetails(callback, jobId) {
  pool2.then(pool => {
    var request = pool.request();
    request.input("jobId", mssql.Int, jobId);
    request.execute("sp_GetJobDetailsByJobId").then(function (data) {
      mssql.close();
      callback(null, data.recordset[0]);
    })
      .catch(function (err) {
        console.log(err);
        res.send(err);
      });
  });
}

/*
**THis function returns the user 
** who posted a job
*/
function getPostedByUserDetails(callback, postedById) {
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

/*
**THis function returns the user list 
** who jave APPROVE_JOB permission
*/
function getJobApprovers(callback, postedById) {
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
            if (parseInt(__o[i].UserId) != parseInt(postedById)) {
              console.log("email user");
              emailId.push(__o[i].EmailAddress);
            }
          }
        }
        callback(null, emailId);
      })
      .catch(function (err) {
        console.log(err);
      });
  });
}


/*
**THis function returns the user list 
** who jave ADD_JOB permission
*/
function getAllRecruiters(callback) {
  pool2.then((pool) => {
    var request = pool.request();
    request.execute('sp_GetRecruitersAndApprovers').then(function (data, recordsets, returnValue, affected) {
      mssql.close();
      var __o = data.recordset;
      var emailId = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          emailId.push(__o[i].EmailAddress);
        }
      }
      console.log(emailId);
      callback(null, emailId)
    }).catch(function (err) {
      console.log(err);
      callback(err)
    });
  });
}

function getAllRecruitersAndReportingPersons(callback) {
  pool2.then((pool) => {
    var request = pool.request();
    request.execute('sp_GetRecruitersAndReportingPersons').then(function (data, recordsets, returnValue, affected) {
      mssql.close();
      var __o = data.recordset;
      var emailId = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          emailId.push(__o[i].EmailAddress);
        }
      }
      console.log(emailId);
      callback(null, emailId)
    }).catch(function (err) {
      console.log(err);
      callback(err)
    });
  });
}

/*
**THis function returns the details of
**the applicant
*/
function getApplicantDetails(callback, applicantId) {
  pool2.then(pool => {
    var request = pool.request();
    request.query("SELECT * FROM Applicants WHERE Applicants.Id = " + applicantId).then(function (data) {
      mssql.close();
      console.log(data);
      callback(null, data.recordset[0]);
    })
      .catch(function (err) {
        console.log(err);
      });
  });
}

/*
**THis function returns the details of
**the applicant with his resume details
*/
function getApplicantWithResume(callback, applicantId) {
  pool2.then(pool => {
    var request = pool.request();
    request.query("SELECT *, Applicants.Id As ApplicantId FROM Applicants LEFT JOIN Resumes ON Applicants.ResumeFileId =  Resumes.Id WHERE Applicants.Id = " + applicantId).then(function (data) {
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

/*
**THis function trigger the mail to all
the recruiters with applicant details and tesume attached
*/
function sendMailToRecruiters(aResult, bResult, jobDetails) {
  var tmplPath, replacements;
  if (typeof (jobDetails) != "undefined") {
    tmplPath = "resume-submission-forjob.html";
    replacements = {
      applicantName: bResult.Name,
      applicantEmail: bResult.EmailAddress,
      jobTitle: jobDetails.JobTitle
    };
  } else {
    tmplPath = "resume-submission-withoutjob.html";
    replacements = {
      applicantName: bResult.Name,
      applicantEmail: bResult.EmailAddress
    }
  }
  var attachments = [
    {   // utf-8 string as an attachment
      filename: bResult.FileName,
      path: './uploads/resumes/' + bResult.ApplicantId + "/" + bResult.FileName
    }
  ]
  triggerMail(tmplPath, replacements, aResult.join(","), "New Resume Submission", attachments);
}

/*
**THis function return job details with user who posted this 
job and return callback
*/
function getJobDetailsWithRecruiter(callback, jobId) {
  pool2.then(pool => {
    var request = pool.request();
    var q = "SELECT * FROM Jobs INNER JOIN Users ON Users.Id = Jobs.PostedById WHERE Jobs.Id= " + jobId;
    console.log(q);
    request.query(q).then(function (data) {
      mssql.close();
      callback(null, data.recordset[0]);
    })
      .catch(function (err) {
        console.log("Error :", err);
        callback(err);
      });
  });
}

/*
**THis function trigger mail to the applicant
**with/without details of recruiter 
*/
function triggerMailToApplicant(aResult, bResult) {
  var tmplPath, replacements, subject;
  if (typeof (aResult) != "undefined") {
    tmplPath = "toapplicantwithjob.html";
    replacements = {
      applicantName: bResult.Name,
      recruiterName: aResult.DisplayName,
      recruiterEmail: aResult.EmailAddress,
      jobTitle: aResult.JobTitle
    };
    subject = 'Application received for the role of ' + aResult.JobTitle;
  } else {
    tmplPath = "toapplicantwithoutjob.html";
    replacements = {
      applicantName: bResult.Name
    }
    subject = 'Application received!'
  }
  console.log(bResult.EmailAddress);
  console.log("Mail sending to the applicant: ", bResult.EmailAddress);
  console.log("Content: ", replacements);
  triggerMail(tmplPath, replacements, bResult.EmailAddress, subject);
}

/*
**THis function returns the comment details
*/
function getCommentDetails(callback, commentId) {
  pool2.then(pool => {
    var request = pool.request();
    var q = "SELECT CommentsOnJob.Id As CommentId, *  FROM CommentsOnJob LEFT JOIN Users ON Users.Id = CommentsOnJob.UserId WHERE CommentsOnJob.Id=" + commentId;
    request.query(q).then(function (data) {
      mssql.close();
      callback(null, data.recordset[0]);
    })
      .catch(function (err) {
        console.log(err);
        res.send(err);
      });
  });
}

/*
**THis function trigger mail to the users/job authors
**that new comment has been added on job 
*/
function triggerMailOnCommentAddedOnJob(commentDetails, emails, jobTitle) {
  var tmplPath = "new-comment.html", replacements;
  replacements = {
    CommentAuthor: commentDetails.DisplayName,
    jobTitle: jobTitle,
    CommentContent: commentDetails.Comment
  };
  triggerMail(tmplPath, replacements, emails.join(","), "New Comment added on " + jobTitle);
}

/*
**This is a single function to trigger a mail.
**all mails are trigger from this function
*/
function triggerMail(tmplName, replacements, to, subject, attachments) {
  readHTMLFile("./__mail_templates/" + tmplName, function (err, html) {
    var template = handlebars.compile(html);
    var htmlToSend = template(replacements);

    // setup email data with unicode symbols
    var mailOptions = {
      from: '"Infinite Computing Systems " <no-reply@infinite-usa.com>', // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      html: htmlToSend
    };
    if (attachments) {
      mailOptions.attachments = attachments;
    }
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      console.log("Mail Sent to: %s", to);
      console.log("Mail Subject is:", subject);
    });
  });
}

//exports javascript function
exports.sendMailAfterJobAdd = sendMailAfterJobAdd;
exports.sendMailAfterApproveJob = sendMailAfterApproveJob;
exports.sendMailAfterApplicantsApplied = sendMailAfterApplicantsApplied;
exports.sendMailToApplicant = sendMailToApplicant;
exports.sendMailToIrrelevantApplicant = sendMailToIrrelevantApplicant;
exports.sendMailAfterUpdateJob = sendMailAfterUpdateJob;
exports.informRecruiterOnApplicantCountOnJob = informRecruiterOnApplicantCountOnJob;
module.exports.loadSchema = createSchema;