var nodemailer = require("nodemailer");
var fs = require("fs");
var handlebars = require("handlebars");
var async = require("async");
var jwtToken = require("./jwt.controller");
var ICS_URL = 'http://careers.infinite-usa.com';
var ICS_ADMIN_URL = "http://admin.infinite-usa.com";
var FCM = require('fcm-push');
var serverKey = '';
var fcm = new FCM('AAAAEorCvMk:APA91bFps9mtelVcroviLVhC3sW0mcWf6Pa4bB_WO3TT1KeR4lYnocXXXkYMflLg1wiC6g8v9e7iw_WTYLEm7FoM0yiPx_2bBIYXgT7OtfOU1CgHvAC0Je4_ngRBju_IUUsO5nHW2Z0V');

var transporter = nodemailer.createTransport({
  host: "Infiniteusa-com02b.mail.protection.outlook.com",
  port: 25,
  secure: false,
});

var app, mssql, pool2;
function createSchema(thisapp, thismssql, thispool2) {
  app = thisapp;
  mssql = thismssql;
  pool2 = thispool2;

  // app.get('/api/sendmailtoirrelevantapplicant', sendMailToIrrelevantApplicant);

  // app.post('/api/sdmonaddcommentonjob', sendMailAfterCommentAddedOnJob);

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
function sendMailAfterLeaveAdd(leaveId, userId, diffDays) {
  console.log("==========Send Mail After Leave Add==========");
  console.log(leaveId);
  console.log(userId);
  console.log(diffDays);
  async.series([
    function (callback) {
      getPostedByUserDetails(callback, userId);
    },
    function (callback) {
      getLeaveDetails(callback, leaveId);
    },
    function (callback) {
      getLeaveApprovers(callback, userId, diffDays);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];
    var cResult = results[2].emailId;
    var aPushId = results[2].pushId;
    var replacements = {
      username: aResult.DisplayName,
      from: bResult.StartDate,
      to: bResult.EndDate,
      loginLink: ICS_ADMIN_URL + "/dashboard/leave-requests",
    };
    triggerMail("leave-created.html", replacements, cResult.join(","), "Leave Approval");
    if (aPushId.length) {
      var message = {
        registration_ids: aPushId,
        notification: {
          title: 'New Leave Approval',
          body: aResult.DisplayName + ' applied for leave. Please review and approve.',
          click_action: "FCM_PLUGIN_ACTIVITY",
        },
        data: {
          // page: "approve-job",
        }
      }
      triggerPushNotification(message);
    }
  });
};

function sendMailAfterApproveLeave(userId, leaveId) {
  console.log("==========Send Mail After Approve Leave==========");
  console.log(userId);
  console.log(leaveId);
  var result1;
  async.waterfall([
    function (callback) {
      getLeaveDetails(callback, leaveId);
    },
    function (aResult, callback) {
      console.log('aResult')
      console.log(aResult)
      result1 = aResult;
      getPostedByUserDetails(callback, aResult.Userid);
    }
  ], function (err, results) {
    console.log(results);
    console.log('---------------------')
    var aResult = [];
    aResult.push(results.EmailAddress);
    var aPushId = [];
    if (results.PushId) {
      aPushId.push(results.PushId);
    }
    var bResult = results;
    console.log(aResult);
    console.log('---------------------')
    console.log(bResult);
    console.log('---------------------')
    var moment = require('moment');
    var replacements = {
      from: moment(result1.StartDate).format('YYYY-MM-DD'),
      to: moment(result1.EndDate).format('YYYY-MM-DD'),
    };
    if (result1.Status == 1) {
      triggerMail("leave-approved.html", replacements, aResult.join(","), "Leave Approved");
      console.log("*******PushId Length****", aPushId.length);
      if (aPushId.length) {
        var message = {
          registration_ids: aPushId,
          notification: {
            title: 'Leave Detail',
            body: 'Your leave is approved.',
            click_action: "FCM_PLUGIN_ACTIVITY",
          },
          data: {
            // page: "job",
            // params: jobId,
          }
        };
        triggerPushNotification(message);
      }
    } else if (result1.Status == 2) {
      triggerMail("leave-reject.html", replacements, aResult.join(","), "Leave Rejected");
      console.log("*******PushId Length****", aPushId.length);
      if (aPushId.length) {
        var message = {
          registration_ids: aPushId,
          notification: {
            title: 'Leave Detail',
            body: 'Your leave is rejected.',
            click_action: "FCM_PLUGIN_ACTIVITY",
          },
          data: {
            // page: "job",
            // params: jobId,
          }
        };
        triggerPushNotification(message);
      }
    }
  });
};


function getLeaveDetails(callback, leaveId) {
  pool2.then(pool => {
    var request = pool.request();
    console.log(leaveId);
    request.input("leaveId", mssql.Int, leaveId);
    request.execute("sp_GetLeaveDetailsByLeaveId").then(function (data) {
      mssql.close();
      console.log("============================================================");
      console.log(data.recordset[0])
      console.log("============================================================");

      callback(null, data.recordset[0]);
    })
      .catch(function (err) {
        console.log(err);
        res.send(err);
      });
  });
}


function getPostedByUserDetails(callback, userId) {
  pool2.then((pool) => {
    var request = pool.request();
    request.input('userId', mssql.Int, userId);
    request.execute('sp_GetEmployeeDetails').then(function (data, recordsets, returnValue, affected) {
      console.log("============================================================");
      console.log(data.recordset[0])
      console.log("============================================================");
      mssql.close();
      callback(null, data.recordset[0])
    }).catch(function (err) {
      console.log(err);
      res.send(err);
    });
  });
}


function getLeaveApprovers(callback, userId, diffDays) {
  console.log("Get Approvers by userId = ", userId);
  pool2.then((pool) => {
    var request = pool.request();
    request.input('userId', mssql.Int, userId);
    request.execute('sp_GetUserManagerDetails').then(function (data, recordsets, returnValue, affected) {
      mssql.close();
      console.log("approvers")
      console.log(data.recordset);
      var __o = data.recordset;
      var emailId = [];
      var pushId = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          if (parseInt(__o[i].Id) != parseInt(userId)) {
            console.log("email user");
            emailId.push(__o[i].EmailAddress);
            if (__o[i].PushId != null) {
              pushId.push(__o[i].PushId);
            }
          }
        }
      }
      if (diffDays > 2) {
        pool2.then(pool => {
          var request = pool.request();
          var query = "select UserId from [EmployeeDeptMapper] where Deptid =(select DeptId from EmployeeDeptMapper where UserId=" + userId + ") and Roleid=1"
          request
            .query(query)
            .then(function (data, recordsets, returnValue, affected) {
              var request = pool.request();
              var query = "  select approverid as UserId from [LeaveDetails] where Leaveid =(select top 1 e.Id  from EmployeeLeave e  where userid="
                + userId + " order by id desc)";
              request
                .query(query)
                .then(function (data2, recordsets, returnValue, affected) {
                  var mang = [];
                  for (var x of data2.recordset) {
                    mang.push(x.UserId);
                  }
                  var arr = [];
                  console.log('manager list = ')
                  console.log(mang);
                  console.log('hod list = ')
                  console.log(data.recordset);
                  for (var d of data.recordset) {
                    if (d.UserId != userId && !mang.includes(d.UserId)) {
                      arr.push(d);
                    }
                  }
                  console.log('fin list = ')
                  console.log(arr);

                  async.eachSeries(arr, function (__t, callback) {
                    var request = pool.request();
                    request.input('userId', mssql.Int, __t);
                    request.execute('sp_GetUserDetails').then(function (data, recordsets, returnValue, affected) {
                      var user = data.recordset[0];
                      if (parseInt(user.Id) != parseInt(userId)) {
                        console.log("email user");
                        emailId.push(user.EmailAddress);
                        if (user.PushId != null) {
                          pushId.push(user.PushId);
                        }
                      }
                      callback();
                    }).catch(function (err) {
                      console.log(err);
                      callback();
                    });
                  }, () => {
                    mssql.close();
                    console.log('hod added');
                    var c = { emailId: emailId, pushId: pushId }
                    callback(null, c);
                  })
                })
            })
        })
      } else {
        var c = { emailId: emailId, pushId: pushId }
        callback(null, c);
      }

    }).catch(function (err) {
      console.log(err);
      res.send(err);
    });
  });

}

function sendMailAfterWfhAdded(wfhId, userId) {
  console.log("==========Send Mail After Wfh Added==========");
  console.log(wfhId);
  console.log(userId);
  console.log(diffDays);
  async.series([
    function (callback) {
      getPostedByUserDetails(callback, userId);
    },
    function (callback) {
      getWfhDetails(callback, wfhId);
    },
    function (callback) {
      getWfhApprovers(callback, userId);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];
    var cResult = results[2].emailId;
    var aPushId = results[2].pushId;
    var replacements = {
      username: aResult.DisplayName,
      from: bResult.StartDate,
      to: bResult.EndDate,
      loginLink: ICS_ADMIN_URL + "/dashboard/wfh-requests",
    };
    triggerMail("wfh-created.html", replacements, cResult.join(","), "WFH Approval");
    if (aPushId.length) {
      var message = {
        registration_ids: aPushId,
        notification: {
          title: 'New Work From Home Approval',
          body: aResult.DisplayName + ' applied for Work From Home. Please review and approve.',
          click_action: "FCM_PLUGIN_ACTIVITY",
        },
        data: {
          // page: "approve-job",
        }
      }
      triggerPushNotification(message);
    }
  });
};


function getWfhDetails(callback, wfhId) {
  pool2.then(pool => {
    var request = pool.request();
    console.log(wfhId);
    request.input("wfhId", mssql.Int, wfhId);
    request.execute("sp_GetWfhDetailsByLeaveId").then(function (data) {
      mssql.close();
      console.log("============================================================");
      console.log(data.recordset[0])
      console.log("============================================================");

      callback(null, data.recordset[0]);
    })
      .catch(function (err) {
        console.log(err);
        res.send(err);
      });
  });
}


function getWfhApprovers(callback, userId) {
  console.log("Get Approvers by userId = ", userId);
  pool2.then((pool) => {
    var request = pool.request();
    request.input('userId', mssql.Int, userId);
    request.execute('sp_GetUserManagerDetails').then(function (data, recordsets, returnValue, affected) {
      mssql.close();
      console.log("approvers")
      console.log(data.recordset);
      var __o = data.recordset;
      var emailId = [];
      var pushId = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          if (parseInt(__o[i].Id) != parseInt(userId)) {
            console.log("email user");
            emailId.push(__o[i].EmailAddress);
            if (__o[i].PushId != null) {
              pushId.push(__o[i].PushId);
            }
          }
        }
      }
      var c = { emailId: emailId, pushId: pushId }
      callback(null, c);
    }).catch(function (err) {
      console.log(err);
      res.send(err);
    });
  });

}

function triggerMail(tmplName, replacements, to, subject, attachments) {
  readHTMLFile("./__mail_templates/" + tmplName, function (err, html) {
    var template = handlebars.compile(html);
    var htmlToSend = template(replacements);
    console.log("list of ppl" + to);
    // setup email data with unicode symbols
    var mailOptions = {
      from: '"Infinite Computing Systems " <no-reply@infinite-usa.com>', // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      html: htmlToSend
    };
    console.log(replacements);

    if (attachments) {
      mailOptions.attachments = attachments;
    }

    // transporter.sendMail(mailOptions, (error, info) => {
    //   if (error) {
    //     return console.log(error);
    //   }
    //   console.log("Message sent: %s", info.messageId);
    //   console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    //   console.log("Mail Sent to: %s", to);
    //   console.log("Mail Subject is:", subject);
    // });


  });
}

function triggerPushNotification(message) {
  console.log("=========Trigger Push Notification COde=======");
  console.log(message)
  // fcm.send(message, function (err, response) {
  //   if (err) {
  //     console.log("Something has gone wrong!");
  //   } else {
  //     console.log("Successfully sent with response: ", response);
  //     console.log(message);
  //   }
  // });
}


/*
**THis function send mail to the approvers that
**new job is added, pls review and publish it
*/
// function sendMailAfterUpdateJob(updatedBy, jobId, divisionId) {
//   console.log("==========Send Mail After Job Updated==========");
//   console.log(updatedBy);
//   console.log(jobId);
//   console.log(divisionId);
//   async.series([
//     function (callback) {
//       getPostedByUserDetails(callback, updatedBy);
//     },
//     function (callback) {
//       getLeaveDetails(callback, jobId);
//     },
//     function (callback) {
//       getLeaveApprovers(callback, divisionId, updatedBy);
//     }
//   ], function (err, results) {
//     var aResult = results[0];
//     var bResult = results[1];
//     var cResult = results[2].emailId;
//     var aPushId = results[2].pushId;
//     var replacements = {
//       recruiter: aResult.DisplayName,
//       jobTitle: bResult.JobTitle,
//       loginLink: ICS_ADMIN_URL + "/dashboard/approve-job",
//       jobCustomTitle: bResult.JobCustomTitle
//     };
//     triggerMail("job-update.html", replacements, cResult.join(","), "Job Updated");
//     if (aPushId.length) {
//       var message = {
//         registration_ids: aPushId,
//         notification: {
//           title: 'Job Updated',
//           body: bResult.JobTitle + ' Job has been updated by ' + aResult.DisplayName + '. Please review and approve.',
//           click_action: "FCM_PLUGIN_ACTIVITY",
//         },
//         data: {
//           page: "approve-job",
//         }
//       };
//       triggerPushNotification(message);
//     }
//   });
// };


// /*
// **THis function send mail to the approvers/recruiter that
// **new job is published.
// */


// /**
//  * Sending mail recruiter who had made changes in job,
//  * after updated job  * has been approved
//  *  * @param {*} jobId 
//  */
// function sendMailAfterApproveUpdatedJob(jobId) {
//   console.log("==========Send Mail After Approve Update of the Job==========");
//   console.log(jobId);
//   var sharedData;
//   async.waterfall([
//     function (callback) {
//       getUpdatedJobDetails(jobId, callback);
//     },
//     function (aResult, callback) {
//       sharedData = aResult;
//       getPostedByUserDetails(callback, aResult.UpdatedById);
//     }
//   ], function (err, results) {
//     var aResult = sharedData;
//     var bResult = results.EmailAddress;
//     var replacements = {
//       jobTitle: aResult.JobTitle,
//       jobLink: ICS_URL + "/job/" + aResult.JobCustomTitle + "/" + aResult.jobId
//     };
//     triggerMail("job-update-published.html", replacements, bResult, "New changes approved - " + aResult.JobTitle);
//   });
// }

// /*
// **THis function send mail to the approvers/recruiter that
// **new new applicant submitted his resume.
// */
// function sendMailAfterApplicantsApplied(applicantId) {
//   console.log("==========Send Mail After Applicant applied for Job==========");
//   async.series([
//     function (callback) {
//       getAdminAndJobOwner(applicantId, callback);
//     },
//     function (callback) {
//       getApplicantWithResume(callback, applicantId);
//     }
//   ], function (err, results) {
//     var aResult = results[0].emailId;
//     var bResult = results[1];
//     var aPushId = results[0].pushId;
//     if (bResult.AppliedForJob != 0) {
//       pool2.then(pool => {
//         var request = pool.request();
//         request.input("jobId", mssql.Int, bResult.AppliedForJob);
//         request.execute("sp_GetJobDetailsByJobId").then(function (data) {
//           mssql.close();
//           console.log(data.recordset[0]);
//           sendMailToRecruiters(aResult, bResult, data.recordset[0]);

//           if (aPushId.length) {
//             var message = {
//               registration_ids: aPushId,
//               notification: {
//                 title: 'New resume submission.',
//                 body: bResult.Name + ' has applied for ' + data.recordset[0].JobTitle,
//                 click_action: "FCM_PLUGIN_ACTIVITY",
//               },
//               data: {
//                 page: "applicants",
//               }
//             };
//             triggerPushNotification(message);
//           }
//         }).catch(function (err) {
//           console.log(err);
//           res.send(err);
//         });
//       });
//     } else {
//       pool2.then((pool) => {
//         var request = pool.request();
//         request.input('JobId', mssql.Int, 0);
//         request.execute('sp_getUserEmailNotification').then(function (data, recordsets, returnValue, affected) {
//           mssql.close();
//           var __o = data.recordset;
//           if (__o.length) {
//             for (var i = 0; i < __o.length; i++) {
//               aResult.push(__o[i].EmailAddress);
//               if (__o[i].PushId) {
//                 aPushId.push(__o[i].PushId);
//               }
//             }
//           }
//           if (aPushId.length) {
//             var message = {
//               registration_ids: aPushId,
//               notification: {
//                 title: 'New resume submission.',
//                 body: 'A new resume has just been submitted by ' + bResult.Name,
//                 click_action: "FCM_PLUGIN_ACTIVITY",
//               },
//               data: {
//                 page: "applicants",
//               }
//             };
//             triggerPushNotification(message);
//           }
//           sendMailToRecruiters(aResult, bResult);
//         })
//       });
//     }
//   });
// };

// /*
// **THis function send mail to the applicant
// */
// function sendMailToApplicant(applicantId, jobId) {
//   async.series([
//     function (callback) {
//       if (typeof (jobId) != "undefined") {
//         getJobDetailsWithRecruiter(callback, jobId);
//       } else {
//         var c;
//         callback(null, c);
//       }
//     },
//     function (callback) {
//       getApplicantDetails(callback, applicantId);
//     }
//   ], function (err, results) {
//     var aResult = results[0];
//     var bResult = results[1];
//     triggerMailToApplicant(aResult, bResult);
//   });
// }

// /*
// **THis function send mail to the applicant which
// **are irrelevant with the current vacancies.
// */
// function sendMailToIrrelevantApplicant(applicantId, jobId) {
//   console.log("Job Id ", jobId);
//   async.series([
//     function (callback) {
//       getApplicantDetails(callback, applicantId)
//     }
//   ], function (err, results) {
//     var applicantDetails = results[0];
//     var tmplPath = "irrelevantjobapplication.html", subject;
//     var replacements = {
//       applicantName: applicantDetails.Name
//     }
//     if (typeof (jobId) != "undefined") {
//       subject = 'Update on your Application Status!';
//     } else {
//       subject = 'Update on your Candidature!'
//     }
//     console.log(applicantDetails.EmailAddress);
//     console.log("Mail sending to the applicant: ", applicantDetails.EmailAddress);
//     console.log("Content: ", replacements);
//     triggerMail(tmplPath, replacements, applicantDetails.EmailAddress, subject);
//   });
// }

// /*
// **THis function send mail to the after comment added on job
// */
// function sendMailAfterCommentAddedOnJob(req, res) {
//   jwtToken.verifyRequest(req, res, decodedToken => {
//     console.log("valid token");
//     if (decodedToken.email) {
//       console.log(req.body);
//       var userId = req.body.userId;
//       var commentId = req.body.commentId;
//       var jobId = req.body.JobId;
//       var c = req.body.emails;
//       var emails = c.split(",");
//       var jobTitle = req.body.jobTitle;
//       async.series([
//         function (callback) {
//           getCommentDetails(callback, commentId);
//         },
//         function (callback) {
//           getCommentsForJob(callback, jobId);
//         },
//         function (callback) {
//           getLeaveDetails(callback, jobId);
//         },
//         function (callback) {
//           getListOfJobsRelatedUsers(callback, jobId);
//         },
//       ], function (err, results) {
//         var aResult = results[0];
//         var bResult = results[1];
//         var cResult = results[2];
//         var dResult = results[3];
//         var pushidArray = [];
//         var emailArray = [];
//         if (cResult.PostedById != userId) {
//           emailArray.push(cResult.EmailAddress);
//           if (cResult.PushId != null) {
//             pushidArray.push(cResult.PushId);
//           }
//         }
//         for (var x of bResult) {
//           if (x.UserId != userId) {
//             console.log(x.UserId = '====' + userId);
//             if (!emailArray.includes(x.EmailAddress)) {
//               emailArray.push(x.EmailAddress);
//               if (x.PushId != null) {
//                 pushidArray.push(x.PushId);
//               }
//             }
//           }
//         }

//         for (var x of dResult) {
//           if (x.userId != userId) {
//             if (!emailArray.includes(x.EmailAddress)) {
//               emailArray.push(x.EmailAddress);
//               if (x.PushId != null) {
//                 pushidArray.push(x.PushId);
//               }
//             }
//           }
//         }
//         console.log('pusharry' + pushidArray);
//         console.log('back emails' + emailArray);

//         res.send({ success: true, message: "mail sent" });
//         triggerMailOnCommentAddedOnJob(aResult, emails, jobTitle);
//         if (pushidArray.length) {
//           var message = {
//             registration_ids: pushidArray,
//             notification: {
//               title: 'New Comment added by ' + aResult.DisplayName + ' on Job : ' + cResult.JobTitle,
//               body: aResult.Comment.substring(0, 50) + '...',
//               click_action: "FCM_PLUGIN_ACTIVITY",
//             },
//             data: {
//               page: "job",
//               params: jobId + '-' + 'comments',
//             }

//           };
//           triggerPushNotification(message);
//         }
//       });
//     } else {
//       res.status("401");
//       res.send(invalidRequestError);
//     }
//   });
// }

// /*
// **THis function send mail to the approvers/recruiter that
// **new new applicant submitted his resume.
// */
// function informRecruiterOnApplicantCountOnJob(jobId, applicantCount) {
//   console.log("==========Send Mail After Applicants Count Limit Reached On Job==========");
//   async.series([
//     function (callback) {
//       getAllRecruiters(callback);
//     },
//     function (callback) {
//       getLeaveDetails(callback, jobId);
//     }
//   ], function (err, results) {
//     var aResult = results[0];
//     var bResult = results[1];

//     var tmplPath = "applicantcountreached.html", subject;
//     var replacements = {
//       jobTitle: bResult.JobTitle,
//       jobCustomTitle: bResult.JobCustomTitle,
//       applicantCount: applicantCount
//     }
//     subject = 'High applications on ' + bResult.JobTitle + "!";
//     triggerMail(tmplPath, replacements, aResult.join(","), subject);
//   });
// };
// /*
// **Pass job id anc callback to this function to
// **GetJobDetails by job id
// */

// /*
// **THis function returns the user 
// ** who posted a job
// */

// /*
// **THis function returns the user list 
// ** who jave APPROVE_JOB permission
// */
// function getJobApprovers(callback, postedById) {
//   pool2.then(pool => {
//     var request = pool.request();
//     request
//       .execute("sp_GetJobApproverUsers")
//       .then(function (data) {
//         mssql.close();
//         var __o = data.recordset;
//         var emailId = [];
//         if (__o.length) {
//           for (var i = 0; i < __o.length; i++) {
//             if (parseInt(__o[i].UserId) != parseInt(postedById)) {
//               console.log("email user");
//               emailId.push(__o[i].EmailAddress);
//             }
//           }
//         }
//         callback(null, emailId);
//       })
//       .catch(function (err) {
//         console.log(err);
//       });
//   });
// }


// /*
// **THis function returns the user list 
// ** who jave ADD_JOB permission
// */
// function getAllRecruiters(callback) {
//   pool2.then((pool) => {
//     var request = pool.request();
//     request.execute('sp_GetRecruitersAndApprovers').then(function (data, recordsets, returnValue, affected) {
//       mssql.close();
//       var __o = data.recordset;
//       var emailId = [];
//       if (__o.length) {
//         for (var i = 0; i < __o.length; i++) {
//           emailId.push(__o[i].EmailAddress);
//         }
//       }
//       console.log(emailId);
//       callback(null, emailId)
//     }).catch(function (err) {
//       console.log(err);
//       callback(err)
//     });
//   });
// }

// function getAllRecruitersAndReportingPersons(callback) {
//   pool2.then((pool) => {
//     var request = pool.request();
//     request.execute('sp_GetRecruitersAndReportingPersons').then(function (data, recordsets, returnValue, affected) {
//       mssql.close();
//       var __o = data.recordset;
//       var emailId = [];
//       if (__o.length) {
//         for (var i = 0; i < __o.length; i++) {
//           emailId.push(__o[i].EmailAddress);
//         }
//       }
//       console.log(emailId);
//       callback(null, emailId)
//     }).catch(function (err) {
//       console.log(err);
//       callback(err)
//     });
//   });
// }

// /*
// **THis function returns the details of
// **the applicant
// */
// function getApplicantDetails(callback, applicantId) {
//   pool2.then(pool => {
//     var request = pool.request();
//     request.query("SELECT * FROM Applicants WHERE Applicants.Id = " + applicantId).then(function (data) {
//       mssql.close();
//       console.log(data);
//       callback(null, data.recordset[0]);
//     })
//       .catch(function (err) {
//         console.log(err);
//       });
//   });
// }

// /*
// **THis function returns the details of
// **the applicant with his resume details
// */
// function getApplicantWithResume(callback, applicantId) {
//   pool2.then(pool => {
//     var request = pool.request();
//     request.query("SELECT *, Applicants.Id As ApplicantId FROM Applicants LEFT JOIN Resumes ON Applicants.ResumeFileId =  Resumes.Id WHERE Applicants.Id = " + applicantId).then(function (data) {
//       mssql.close();
//       console.log(data);
//       callback(null, data.recordset[0]);
//     })
//       .catch(function (err) {
//         console.log(err);
//         res.send(err);
//       });
//   });
// }

// /*
// **THis function trigger the mail to all
// the recruiters with applicant details and tesume attached
// */
// function sendMailToRecruiters(aResult, bResult, jobDetails) {
//   var tmplPath, replacements;
//   if (typeof (jobDetails) != "undefined") {
//     tmplPath = "resume-submission-forjob.html";
//     replacements = {
//       applicantName: bResult.Name,
//       applicantEmail: bResult.EmailAddress,
//       jobTitle: jobDetails.JobTitle
//     };
//   } else {
//     tmplPath = "resume-submission-withoutjob.html";
//     replacements = {
//       applicantName: bResult.Name,
//       applicantEmail: bResult.EmailAddress
//     }
//   }
//   var attachments = [
//     {   // utf-8 string as an attachment
//       filename: bResult.FileName,
//       path: './uploads/resumes/' + bResult.ApplicantId + "/" + bResult.FileName
//     }
//   ]
//   triggerMail(tmplPath, replacements, aResult.join(","), "New Resume Submission", attachments);

// }

// /*
// **THis function return job details with user who posted this 
// job and return callback
// */
// function getJobDetailsWithRecruiter(callback, jobId) {
//   pool2.then(pool => {
//     var request = pool.request();
//     var q = "SELECT * FROM Jobs INNER JOIN Users ON Users.Id = Jobs.PostedById WHERE Jobs.Id= " + jobId;
//     console.log(q);
//     request.query(q).then(function (data) {
//       mssql.close();
//       callback(null, data.recordset[0]);
//     })
//       .catch(function (err) {
//         console.log("Error :", err);
//         callback(err);
//       });
//   });
// }

// /*
// **THis function trigger mail to the applicant
// **with/without details of recruiter 
// */
// function triggerMailToApplicant(aResult, bResult) {
//   var tmplPath, replacements, subject;
//   if (typeof (aResult) != "undefined") {
//     tmplPath = "toapplicantwithjob.html";
//     replacements = {
//       applicantName: bResult.Name,
//       recruiterName: aResult.DisplayName,
//       recruiterEmail: aResult.EmailAddress,
//       jobTitle: aResult.JobTitle
//     };
//     subject = 'Application received for the role of ' + aResult.JobTitle;
//   } else {
//     tmplPath = "toapplicantwithoutjob.html";
//     replacements = {
//       applicantName: bResult.Name
//     }
//     subject = 'Application received!'
//   }
//   console.log(bResult.EmailAddress);
//   console.log("Mail sending to the applicant: ", bResult.EmailAddress);
//   console.log("Content: ", replacements);
//   triggerMail(tmplPath, replacements, bResult.EmailAddress, subject);
// }

// /*
// **THis function returns the comment details
// */
// function getCommentDetails(callback, commentId) {
//   pool2.then(pool => {
//     var request = pool.request();
//     var q = "SELECT CommentsOnJob.Id As CommentId, *  FROM CommentsOnJob LEFT JOIN Users ON Users.Id = CommentsOnJob.UserId WHERE CommentsOnJob.Id=" + commentId;
//     request.query(q).then(function (data) {
//       mssql.close();
//       callback(null, data.recordset[0]);
//     })
//       .catch(function (err) {
//         console.log(err);
//         res.send(err);
//       });
//   });
// }

// /*
// **THis function trigger mail to the users/job authors
// **that new comment has been added on job 
// */
// function triggerMailOnCommentAddedOnJob(commentDetails, emails, jobTitle) {
//   var tmplPath = "new-comment.html", replacements;
//   replacements = {
//     CommentAuthor: commentDetails.DisplayName,
//     jobTitle: jobTitle,
//     CommentContent: commentDetails.Comment
//   };
//   triggerMail(tmplPath, replacements, emails.join(","), "New Comment added on " + jobTitle);
// }

// /*
// **This is a single function to trigger a mail.
// **all mails are trigger from this function
// */

// /*
// **THis function returns the updated job details
// ** 
// */
// function getUpdatedJobDetails(jobId, callback) {
//   pool2.then((pool) => {
//     var request = pool.request();
//     var query = "select Top 1 * from GetUpdatedJobUpdateDetails where jobId = " + jobId + " ORDER BY TrackId DESC";
//     request.query(query).then(function (data, recordsets, returnValue, affected) {
//       mssql.close();
//       var __o = data.recordset[0];
//       callback(null, __o)
//     }).catch(function (err) {
//       console.log(err);
//       callback(err)
//     });
//   });
// }

// /**
//  * This function return the division admin
//  */

// /**
//  * This function return the all division members
//  */
// function getAllMembersOfDivision(callback, DivisionId, jobId) {
//   console.log("Get all members");
//   pool2.then((pool) => {
//     var request = pool.request();
//     var query;
//     if (DivisionId) {
//       query = "SELECT * FROM DivisionUserMapping ";
//       query = query + "INNER JOIN Users ON DivisionUserMapping.UserId = Users.Id"
//       query = query + "  WHERE  DivisionUserMapping.IsDeleted = 0 AND DivisionId = " + DivisionId;
//     } else {
//       query = "SELECT * FROM DivisionUserMapping INNER JOIN Users ON DivisionUserMapping.UserId = Users.Id  WHERE  DivisionUserMapping.IsDeleted = 0 AND DivisionId is not null";
//     }
//     console.log(query);
//     request.query(query).then(function (data, recordsets, returnValue, affected) {
//       mssql.close();
//       console.log(data.recordset);
//       var __o = data.recordset;
//       var emailId = [];
//       var pushId = [];
//       if (__o.length) {
//         for (var i = 0; i < __o.length; i++) {
//           emailId.push(__o[i].EmailAddress);
//           if (__o[i].PushId != null) {
//             pushId.push(__o[i].PushId);
//           }
//         }
//       }
//       var c = { emailId: emailId, pushId: pushId }
//       callback(null, c);
//     }).catch(function (err) {
//       console.log(err);
//       callback(err)
//     });
//   });
// }

// function getAdminAndJobOwner(applicantId, callback) {
//   pool2.then((pool) => {
//     var request = pool.request();
//     var query = "select * from applicants left join Jobs on applicants.AppliedForJob=jobs.id where applicants.id=" + applicantId;
//     request.query(query).then(function (data, recordsets, returnValue, affected) {
//       mssql.close();
//       pool2.then((pool) => {
//         var request = pool.request();
//         request.input('DivisionId', mssql.Int, data.recordset[0].DivisionId);
//         request.input('applicantId', mssql.Int, applicantId);
//         request.execute('sp_GetAdminAndMember').then(function (data, recordsets, returnValue, affected) {
//           mssql.close();
//           var __o = data.recordset;
//           var emailId = [];
//           var pushId = [];
//           if (__o.length) {
//             for (var i = 0; i < __o.length; i++) {
//               emailId.push(__o[i].EmailAddress);
//               if (__o[i].PushId != null) {
//                 pushId.push(__o[i].PushId);
//               }
//             }
//           }
//           console.log(emailId);
//           var c = { emailId: emailId, pushId: pushId }
//           callback(null, c)
//         }).catch(function (err) {
//           console.log(err);
//           callback(err)
//         });
//       });
//     }).catch(function (err) {
//       console.log(err);
//       res.send(err);
//     });
//   });


// }

// function getCommentsForJob(callback, jobId) {
//   pool2.then(pool => {
//     var request = pool.request();
//     console.log(jobId);
//     request.input("jobId", mssql.Int, jobId);
//     request.execute("sp_getCommentsForJob").then(function (data) {
//       mssql.close();
//       console.log("comment details");
//       console.log("============================================================");
//       console.log(data.recordset)
//       console.log("============================================================");
//       callback(null, data.recordset);
//     })
//       .catch(function (err) {
//         console.log(err);
//         res.send(err);
//       });
//   });
// }

// function getListOfJobsRelatedUsers(callback, jobId) {
//   pool2.then(pool => {
//     var request = pool.request();
//     var query = 'select UpdatedById,EmailAddress,PushId,count(UserName ) as no_of_updates from JobUpdate left join users on UpdatedById=users.Id where jobid=' + jobId + ' and IsApproved=1 group by EmailAddress,PushId,UpdatedById';
//     console.log(query);
//     request.query(query).then(function (data, recordsets, returnValue, affected) {
//       mssql.close();
//       console.log("ListOfJobsRelatedUsers");
//       console.log("============================================================");
//       console.log(data.recordset)
//       console.log("============================================================");
//       callback(null, data.recordset);
//     })
//       .catch(function (err) {
//         console.log(err);
//         res.send(err);
//       });
//   });
// }



//exports javascript function
exports.sendMailAfterLeaveAdd = sendMailAfterLeaveAdd;
exports.sendMailAfterApproveLeave = sendMailAfterApproveLeave;
exports.sendMailAfterWfhAdded = sendMailAfterWfhAdded;

// exports.sendMailAfterApplicantsApplied = sendMailAfterApplicantsApplied;
// exports.sendMailToApplicant = sendMailToApplicant;
// exports.sendMailToIrrelevantApplicant = sendMailToIrrelevantApplicant;
// exports.sendMailAfterUpdateJob = sendMailAfterUpdateJob;
// exports.informRecruiterOnApplicantCountOnJob = informRecruiterOnApplicantCountOnJob;
// exports.sendMailAfterApproveUpdatedJob = sendMailAfterApproveUpdatedJob;

module.exports.loadSchema = createSchema;