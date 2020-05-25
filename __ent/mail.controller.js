var nodemailer = require("nodemailer");
var fs = require("fs");
var handlebars = require("handlebars");
var async = require("async");
var jwtToken = require("./jwt.controller");
var ICS_URL = 'http://careers.infinite-usa.com';
var ICS_ADMIN_URL = "http://admin.infinite-usa.com";
var FCM = require('fcm-push');
var serverKey = undefined;
var fcm = new FCM('AAAAEorCvMk:APA91bFps9mtelVcroviLVhC3sW0mcWf6Pa4bB_WO3TT1KeR4lYnocXXXkYMflLg1wiC6g8v9e7iw_WTYLEm7FoM0yiPx_2bBIYXgT7OtfOU1CgHvAC0Je4_ngRBju_IUUsO5nHW2Z0V');
var moment = require('moment');

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
    var moment = require('moment');
    var line = undefined
    if (moment(bResult.EndDate).format("MM-DD-YYYY") == moment(bResult.StartDate).format("MM-DD-YYYY")) {
      line = 'on <strong>' + moment(bResult.EndDate).format('MMM DD YYYY') + ' </strong>';
    } else {
      line = 'from <strong>' + moment(bResult.StartDate).format('MMM DD YYYY') + ' </strong> to <strong>' + moment(bResult.EndDate).format("'MMM DD YYYY'") + ' </strong>';
    }
    var innertext='<p style="font-size:16px;line-height:24px;color:#4c4c4c"><strong>'+aResult.DisplayName+'</strong> has applied for leave '+line+'. Please review and approve.</p>'
    var replacements = {
      username: aResult.DisplayName,
      line: line,
      innertext:innertext,
      loginLink: ICS_ADMIN_URL + "/dashboard/leave-requests",
    };
    triggerMail("leave-created.html", replacements, cResult.join(","), "New Leave Request");
    if (aPushId.length) {
      var message = {
        registration_ids: aPushId,
        notification: {
          title: 'New Leave Request',
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
      username: results.DisplayName
    };
    if (result1.Status == 1) {
      triggerMail("leave-approved.html", replacements, aResult.join(","), "Leave Request Updates");
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
      triggerMail("leave-reject.html", replacements, aResult.join(","), "Leave Request Updates");
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

function getPostedByUserDetailsFromEmployeecode(callback, empCode) {
  pool2.then((pool) => {
    var request = pool.request();
    request.input('empCode', mssql.VarChar(100), empCode);
    request.execute('[sp_GetEmployeeDetailsByEmpcode]').then(function (data, recordsets, returnValue, affected) {
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
    var line = undefined
    if (moment(bResult.EndDate).format("MM-DD-YYYY") == moment(bResult.StartDate).format("MM-DD-YYYY")) {
      line = "on <strong>" + moment(bResult.EndDate).format('MMM DD YYYY') + " </strong>";
    } else {
      line = 'from <strong>' + moment(bResult.StartDate).format('MMM DD YYYY') + ' </strong> to <strong>' + moment(bResult.EndDate).format('MMM DD YYYY') + ' </strong>';
    }
    var replacements = {
      username: aResult.DisplayName,
      line: line,
      loginLink: ICS_ADMIN_URL + "/dashboard/leave-requests",
    };

    triggerMail("wfh-created.html", replacements, cResult.join(","), "New Work-from-home Request");
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
    request.execute("[sp_GetWfhDetailsByWfhId]").then(function (data) {
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

function sendMailAfterApproveWfh(userId, wfhId) {
  console.log("==========Send Mail After WFH Leave==========");
  console.log(userId);
  console.log(wfhId);
  var result1;
  async.waterfall([
    function (callback) {
      getWfhDetails(callback, wfhId);
    },
    function (aResult, callback) {
      console.log('aResult')
      console.log(aResult)
      result1 = aResult;
      getPostedByUserDetails(callback, aResult.UserId);
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
    var replacements = {
      from: moment(result1.StartDate).format('YYYY-MM-DD'),
      to: moment(result1.EndDate).format('YYYY-MM-DD'),
      username: results.DisplayName
    };
    if (result1.Status == 1) {
      triggerMail("wfh-approved.html", replacements, aResult.join(","), "Work-from-home Request Updates");
      console.log("*******PushId Length****", aPushId.length);
      if (aPushId.length) {
        var message = {
          registration_ids: aPushId,
          notification: {
            title: 'Work-from-home Detail',
            body: 'Your WFH request is approved.',
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
      triggerMail("wfh-reject.html", replacements, aResult.join(","), "Work-from-home Request Updates");
      console.log("*******PushId Length****", aPushId.length);
      if (aPushId.length) {
        var message = {
          registration_ids: aPushId,
          notification: {
            title: 'Work-from-home Detail',
            body: 'Your WFH request is rejected.',
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

function sendMailAfterRegReqAdded(date, empCode) {
  console.log("==========Send Mail After Reg Req Added==========");
  console.log(date);
  console.log(empCode);
  async.series([
    function (callback) {
      getPostedByUserDetailsFromEmployeecode(callback, empCode);
    },
    function (callback) {
      getRegApprovers(callback, empCode);
    }
  ], function (err, results) {
    var aResult = results[0];
    var cResult = results[1].emailId;
    var aPushId = results[1].pushId;
    var replacements = {
      username: aResult.DisplayName,
      date: moment(date).format("'MMM DD YYYY'"),
      loginLink: ICS_ADMIN_URL + "/dashboard/leave-requests",
    };

    triggerMail("reg-request.html", replacements, cResult.join(","), "New Regularize Request");
    if (aPushId.length) {
      var message = {
        registration_ids: aPushId,
        notification: {
          title: 'New Regularize Request',
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

function sendMailAfterRegReqApprove(trackId, date, status) {
  console.log("==========Send Mail After Reg Req Approve/reject==========");
  console.log(trackId);
  console.log(date);
  async.series([
    function (callback) {
      getUserDetailsFromRegId(callback, trackId);
    }
  ], function (err, results) {
    var aResult = results[0].data;
    var cResult = results[0].emailId;
    var aPushId = results[0].pushId;
    var replacements = {
      username: aResult.DisplayName,
      date: moment(date).format("'MMM DD YYYY'"),
      loginLink: ICS_ADMIN_URL + "/dashboard/leave-requests",
    };

    if (status == 1) {
      triggerMail("reg-approved.html", replacements, cResult.join(","), "Regularize Request Updates");
      console.log("*******PushId Length****", aPushId.length);
      if (aPushId.length) {
        var message = {
          registration_ids: aPushId,
          notification: {
            title: 'Regularize Request Updates',
            body: 'Your Regularize request is approved.',
            click_action: "FCM_PLUGIN_ACTIVITY",
          },
          data: {
            // page: "job",
            // params: jobId,
          }
        };
        triggerPushNotification(message);
      }
    } else if (status == 0) {
      triggerMail("reg-reject.html", replacements, cResult.join(","), "Regularize Request Updates");
      console.log("*******PushId Length****", aPushId.length);
      if (aPushId.length) {
        var message = {
          registration_ids: aPushId,
          notification: {
            title: 'Regularize Request Updates',
            body: 'Your Regularize request is rejected.',
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

function getUserDetailsFromRegId(callback, trackId) {
  pool2.then((pool) => {
    var request = pool.request();
    request.input('trackId', mssql.VarChar(100), trackId);
    request.execute('[sp_GetEmployeeDetailsBytrackId]').then(function (data, recordsets, returnValue, affected) {
      console.log("============================================================");
      console.log(data.recordset[0])
      console.log("============================================================");
      mssql.close();
      console.log(data.recordset);
      var __o = data.recordset;
      var emailId = [];
      var pushId = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          console.log("email user");
          emailId.push(__o[i].EmailAddress);
          if (__o[i].PushId != null) {
            pushId.push(__o[i].PushId);
          }
        }
      }
      var c = { data: data.recordset, emailId: emailId, pushId: pushId }
      callback(null, c);
    }).catch(function (err) {
      console.log(err);
      res.send(err);
    });
  });
}

function getRegApprovers(callback, empCode) {
  console.log("Get reg approver");
  pool2.then((pool) => {
    var request = pool.request();
    request.execute('sp_RegApprovers').then(function (data, recordsets, returnValue, affected) {
      mssql.close();
      console.log(" reg approvers")
      console.log(data.recordset);
      var __o = data.recordset;
      var emailId = [];
      var pushId = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          if ((__o[i].EmployeeCode) != empCode) {
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

//exports javascript function
exports.sendMailAfterLeaveAdd = sendMailAfterLeaveAdd;
exports.sendMailAfterApproveLeave = sendMailAfterApproveLeave;
exports.sendMailAfterWfhAdded = sendMailAfterWfhAdded;
exports.sendMailAfterApproveWfh = sendMailAfterApproveWfh;
exports.sendMailAfterRegReqAdded = sendMailAfterRegReqAdded;
exports.sendMailAfterRegReqApprove = sendMailAfterRegReqApprove;


// exports.sendMailAfterApplicantsApplied = sendMailAfterApplicantsApplied;
// exports.sendMailToApplicant = sendMailToApplicant;
// exports.sendMailToIrrelevantApplicant = sendMailToIrrelevantApplicant;
// exports.sendMailAfterUpdateJob = sendMailAfterUpdateJob;
// exports.informRecruiterOnApplicantCountOnJob = informRecruiterOnApplicantCountOnJob;
// exports.sendMailAfterApproveUpdatedJob = sendMailAfterApproveUpdatedJob;

module.exports.loadSchema = createSchema;