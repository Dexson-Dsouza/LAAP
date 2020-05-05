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
    var replacements = {
      from: bResult.StartDate,
      to: bResult.EndDate,
    };
    triggerMail("leave-approved.html", replacements, aResult.join(","), "Leave Approved");
    console.log("*******PushId Length****", aPushId.length);
    if (aPushId.length) {
      var message = {
        registration_ids: aPushId,
        notification: {
          title: 'Leave Approved',
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
    // console.log(mailOptions);

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

// exports.sendMailAfterApplicantsApplied = sendMailAfterApplicantsApplied;
// exports.sendMailToApplicant = sendMailToApplicant;
// exports.sendMailToIrrelevantApplicant = sendMailToIrrelevantApplicant;
// exports.sendMailAfterUpdateJob = sendMailAfterUpdateJob;
// exports.informRecruiterOnApplicantCountOnJob = informRecruiterOnApplicantCountOnJob;
// exports.sendMailAfterApproveUpdatedJob = sendMailAfterApproveUpdatedJob;

module.exports.loadSchema = createSchema;