var nodemailer = require("nodemailer");
var fs = require("fs");
var handlebars = require("handlebars");
var async = require("async");
var jwtToken = require("./jwt.controller");
var ICS_URL = 'http://careers.infinite-usa.com';
var ICS_ADMIN_URL = "http://192.168.8.55:91";
var FCM = require('fcm-push');
var serverKey = undefined;
var fcm = new FCM('AAAAEorCvMk:APA91bFps9mtelVcroviLVhC3sW0mcWf6Pa4bB_WO3TT1KeR4lYnocXXXkYMflLg1wiC6g8v9e7iw_WTYLEm7FoM0yiPx_2bBIYXgT7OtfOU1CgHvAC0Je4_ngRBju_IUUsO5nHW2Z0V');
var moment = require('moment');
const { ident } = require("pg-format");
var HR_mail = 'djdsouza@infinite-usa.com'
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
    var names = [];
    names = results[2].names;

    var moment = require('moment');
    var line1 = 'on <strong>' + moment(bResult.EndDate).format('MMM DD YYYY') + ' </strong>';
    var line2 = 'from <strong>' + moment(bResult.StartDate).format('MMM DD YYYY') + ' </strong> to <strong>' + moment(bResult.EndDate).format("'MMM DD YYYY'") + ' </strong>';
    var oneday = false;
    if (moment(bResult.EndDate, 'YYYY-MM-DD').format("MM-DD-YYYY") == moment(bResult.StartDate, 'YYYY-MM-DD').format("MM-DD-YYYY")) {
      oneday = true;
    }
    // var innertext = '<p style="font-size:16px;line-height:24px;color:#4c4c4c"><strong>' + aResult.DisplayName + '</strong> has applied for leave ' + line + '. Please review and approve.</p>'
    var replacements = {
      username: aResult.DisplayName,
      startdate: moment(bResult.StartDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      endate: moment(bResult.EndDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      oneday: oneday,
      LeaveCategoryname: bResult.LeaveCategoryname,
      LeaveDetails: bResult,
      names: names.join(","),
      // innertext: innertext,
      loginLink: ICS_ADMIN_URL + "/dashboard/leave-requests",
      CC: HR_mail,
      LWP: bResult.LWP == 1 ? true : false,
    };
    triggerMail("leave-created.html", replacements, cResult.join(","), "Leave Request");
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
  var result1;//leave details
  var result2;//approvers
  async.waterfall([
    function (callback) {
      getLeaveApproverDetails(callback, leaveId);
    },
    function (bResult, callback) {
      console.log('bResult')
      console.log(bResult)
      result2 = bResult;
      console.log('---------------------')
      getLeaveDetails(callback, leaveId);
    },
    function (aResult, callback) {
      console.log('aResult')
      console.log(aResult)
      result1 = aResult;
      console.log('---------------------')
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
    var approver = result2.find((x) => {
      return x.UserId == userId;
    })
    var pendingApprover = [];
    if (approver.Status == 1 && result1.Status != 1) {
      result2.forEach((x) => {
        if (x.Status == 3) {
          pendingApprover.push(x.DisplayName);
        }
      })
    }
    var bResult = results;
    var moment = require('moment');
    var replacements = {
      from: moment(result1.StartDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      to: moment(result1.EndDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      bResult: bResult,
      aResult: results,
      LeaveDetails: result1,
      approved: approver.Status == 1 ? true : false,
      pendingApprover: pendingApprover.join(','),
      approver: approver,
      CC: HR_mail,
      LWP: result1.LWP == 1 ? true : false,
    };
    var subject;
    triggerMail("leave-approval.html", replacements, aResult.join(","), "Your Leave Request has been updated by " + approver.DisplayName);
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

  });
};

function getLeaveApproverDetails(callback, leaveId) {
  pool2.then(pool => {
    var request = pool.request();
    request.query("select *,u.Id as UserId  from leaveDetails l left join users u on l.ApproverId=u.Id where leaveid =" + leaveId).then(function (data) {
      mssql.close();
      console.log("======================leaveDetails============================");
      console.log(data.recordset)
      console.log("======================leaveDetails==========================");

      callback(null, data.recordset);
    })
      .catch(function (err) {
        console.log(err);
        res.send(err);
      });
  });
}


function getWfhApproverDetails(callback, wfhid) {
  pool2.then(pool => {
    var request = pool.request();
    request.query("select *,u.Id as UserId  from employeewfhdetails w left join users u on w.ApproverId=u.Id where wfhid =" + wfhid).then(function (data) {
      mssql.close();
      console.log("======================employeewfhdetails============================");
      console.log(data.recordset)
      console.log("======================employeewfhdetails==========================");

      callback(null, data.recordset);
    })
      .catch(function (err) {
        console.log(err);
        res.send(err);
      });
  });
}


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
      var names = [];
      var userid = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          if (parseInt(__o[i].Id) != parseInt(userId)) {
            console.log("email user");
            emailId.push(__o[i].EmailAddress);
            names.push(__o[i].DisplayName);
            userid.push(__o[i].Id);
            if (__o[i].PushId != null) {
              pushId.push(__o[i].PushId);
            }
          }
        }
      }
      if (diffDays > 2) {
        pool2.then(pool => {
          var request = pool.request();
          var query = "select UserId from [EmployeeDeptMapper] where Deptid =(select DeptId from EmployeeDeptMapper where UserId=" + userId + ") and Roleid=1 and isDeleted =0"
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
                  console.log(mang)
                  var arr = mang;
                  // console.log('manager list = ')
                  // console.log(mang);
                  // console.log('hod list = ')
                  // console.log(data.recordset);
                  // for (var d of data.recordset) {
                  //   if (d.UserId != userId && !mang.includes(d.UserId)) {
                  //     arr.push(d);
                  //   }
                  // }
                  console.log('fin list = ')
                  console.log(arr);

                  async.eachSeries(arr, function (__t, callback) {
                    var request = pool.request();
                    request.input('userId', mssql.Int, __t);
                    request.execute('sp_GetUserDetails').then(function (data, recordsets, returnValue, affected) {
                      var user = data.recordset[0];
                      if (parseInt(user.Id) != parseInt(userId)) {
                        console.log("email user");
                        if (!emailId.includes(user.EmailAddress)) {
                          emailId.push(user.EmailAddress);
                          names.push(user.DisplayName);
                        }
                        if (user.PushId != null) {
                          if (!pushId.includes(user.PushId)) {
                            pushId.push(user.PushId);
                          }
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
                    var c = { emailId: emailId, pushId: pushId, names: names }
                    callback(null, c);
                  })
                })
            })
        })
      } else {
        var c = { emailId: emailId, pushId: pushId, names: names }
        callback(null, c);
      }

    }).catch(function (err) {
      console.log(err);
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
    var names = results[2].names;
    var line = undefined
    var oneday = false;
    if (moment(bResult.EndDate, 'YYYY-MM-DD HH:mm:ss').format("MM-DD-YYYY") == moment(bResult.StartDate, 'YYYY-MM-DD HH:mm:ss').format("MM-DD-YYYY")) {
      oneday = true;
    }
    var replacements = {
      username: aResult.DisplayName,
      line: line,
      startdate: moment(bResult.StartDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      endate: moment(bResult.EndDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      oneday: oneday,
      loginLink: ICS_ADMIN_URL + "/dashboard/wfh",
      WfhDetails: bResult,
      names: names.join(","),
      CC: HR_mail
    };

    triggerMail("wfh-created.html", replacements, cResult.join(","), "New work from home Request");
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



function getWfhRegDetails(callback, wfhId) {
  pool2.then(pool => {
    var request = pool.request();
    console.log(wfhId);
    request.input("wfhId", mssql.Int, wfhId);
    request.execute("[sp_GetWfh-RegDetailsByWfhId]").then(function (data) {
      var request = pool.request();
      request.input("UserId", mssql.Int, data.recordset[0].UserId);
      request.input("Date", mssql.DateTime, data.recordset[0].AttendanceDate);
      request
        .execute("sp_getTaskList")
        .then(function (data2, recordsets, returnValue, affected) {
          mssql.close();
          data.recordset[0].TaskList = data2.recordset;
          console.log("============================================================");
          console.log(data.recordset[0])
          console.log("============================================================");
          callback(null, data.recordset[0]);
        })
        .catch(function (err) {
          console.log(err);
          callback();
        });
    })
      .catch(function (err) {
        console.log(err);
        res.send(err);
      });
  });
}

function getRegDetails(callback, AttendanceLogId) {
  pool2.then(pool => {
    var request = pool.request();
    request.input("AttendanceLogId", mssql.Int, AttendanceLogId);
    request.execute("getRegDetails").then(function (data) {
      mssql.close();
      console.log("===================getRegDetails=========================================");
      console.log(data.recordset[0])
      console.log("======================getRegDetails======================================");

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
      var names = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          if (parseInt(__o[i].Id) != parseInt(userId)) {
            console.log("email user");
            emailId.push(__o[i].EmailAddress);
            names.push(__o[i].DisplayName);
            if (__o[i].PushId != null) {
              pushId.push(__o[i].PushId);
            }
          }
        }
      }
      var c = { emailId: emailId, pushId: pushId, names: names }
      callback(null, c);
    }).catch(function (err) {
      console.log(err);
      res.send(err);
    });
  });
}

function sendMailAfterApproveWfh(userId, wfhId) {
  console.log("==========Send Mail After WFH ==========");
  console.log(userId);
  console.log(wfhId);
  var result1;
  var result2;//approvers
  async.waterfall([
    function (callback) {
      getWfhApproverDetails(callback, wfhId);
    },
    function (bResult, callback) {
      console.log('bResult')
      console.log(bResult)
      result2 = bResult;
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
    var approver = result2.find((x) => {
      return x.UserId == userId;
    })

    var pendingApprover = [];
    if (approver.Status == 1 && result1.Status != 1) {
      result2.forEach((x) => {
        if (x.Status == 3) {
          pendingApprover.push(x.DisplayName);
        }
      })
    }

    var bResult = results;
    var replacements = {
      from: moment(result1.StartDate, 'YYYY-MM-DD HH:mm:ss').utc().format('YYYY-MM-DD'),
      to: moment(result1.EndDate, 'YYYY-MM-DD HH:mm:ss').utc().format('YYYY-MM-DD'),
      username: results.DisplayName,
      bResult: bResult,
      aResult: results,
      wfhDetails: result1,
      approved: approver.Status == 1 ? true : false,
      pendingApprover: pendingApprover.join(','),
      approver: approver,
      CC: HR_mail
    };
    triggerMail("wfh-approval.html", replacements, aResult.join(","), "Your Work from home Request has been updated by " + approver.DisplayName);
    console.log("*******PushId Length****", aPushId.length);
    if (aPushId.length) {
      var message = {
        registration_ids: aPushId,
        notification: {
          title: 'Work from home Detail',
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

  });
};

function sendMailAfterRegReqAdded(date, empCode, AttendanceLogId) {
  console.log("==========Send Mail After Reg Req Added==========");
  console.log(date);
  console.log(empCode);
  async.series([
    function (callback) {
      getPostedByUserDetailsFromEmployeecode(callback, empCode);
    },
    function (callback) {
      getRegApprovers(callback, empCode);
    },
    function (callback) {
      getRegDetails(callback, AttendanceLogId);
    }
  ], function (err, results) {
    var aResult = results[0];
    var cResult = results[1].emailId;
    var aPushId = results[1].pushId;
    var names = results[1].names;
    var regDetails = results[2];
    regDetails.OldInTime = moment(regDetails.OldInTime).format(' h:mm A')
    regDetails.OldOutTime = moment(regDetails.OldOutTime).format(' h:mm A')
    regDetails.InTime = moment(regDetails.InTime).format(' h:mm A')
    regDetails.OutTime = moment(regDetails.OutTime).format(' h:mm A')
    var replacements = {
      username: aResult.DisplayName,
      date: moment(date, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      loginLink: ICS_ADMIN_URL + "/dashboard/regularize-requests",
      regDetails: regDetails,
      names: names.join(",")
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

function sendMailAfterRegReqApprove(trackId, date, AttendanceLogId) {
  console.log("==========Send Mail After Reg Req Approve/reject==========");
  console.log(trackId);
  console.log(date);
  async.series([
    function (callback) {
      getUserDetailsFromRegId(callback, trackId);
    },
    function (callback) {
      getRegDetails(callback, AttendanceLogId);
    }
  ], function (err, results) {
    var aResult = results[0].data;
    var cResult = results[0].emailId;
    var aPushId = results[0].pushId;
    var regDetails = results[1];
    regDetails.OldInTime = moment(regDetails.OldInTime).format(' h:mm A')
    regDetails.OldOutTime = moment(regDetails.OldOutTime).format(' h:mm A')
    regDetails.InTime = moment(regDetails.InTime).format(' h:mm A')
    regDetails.OutTime = moment(regDetails.OutTime).format(' h:mm A')
    var replacements = {
      username: aResult.DisplayName,
      date: moment(date, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      loginLink: ICS_ADMIN_URL + "/dashboard/leave-requests",
      regDetails: regDetails,
    };
    triggerMail("reg-approval.html", replacements, cResult.join(","), "Your Regularize Request has been updated by " + regDetails.DisplayName);
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
      var c = { data: data.recordset[0], emailId: emailId, pushId: pushId }
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
      var names = [];
      if (__o.length) {
        for (var i = 0; i < __o.length; i++) {
          if ((__o[i].EmployeeCode) != empCode) {
            console.log("email user");
            emailId.push(__o[i].EmailAddress);
            names.push(__o[i].DisplayName);
            if (__o[i].PushId != null) {
              pushId.push(__o[i].PushId);
            }
          }
        }
      }
      var c = { emailId: emailId, pushId: pushId, names: names }
      callback(null, c);
    }).catch(function (err) {
      console.log(err);
      res.send(err);
    });
  });
}

function sendReportToUser(req) {
  console.log("==========Send Reports==========");
  async.series([
    function (callback) {
      getuserreports(callback, req);
    },
    function (callback) {
      getPostedByUserDetails(callback, req.body.UserId);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];
    console.log("====a====");
    console.log(aResult);
    console.log("====b====");
    console.log(bResult);
    var aPushId = [];
    if (bResult.PushId) {
      aPushId.push(bResult.PushId);
    }
    var moment = require('moment');
    var date = moment(aResult.Year + '/' + aResult.Month + '/01');
    var end_date = moment(req.body.CurrentDate).add(1, 'days');
    var hours = Math.floor(aResult.Shortfall / 60);
    var mins = aResult.Shortfall % 60;
    var replacements = {
      report: aResult,
      user: bResult,
      date: date.format('MMMM YYYY'),
      end_date: end_date.format('Do MMMM YYYY'),
      last_date: date.endOf('month').format('Do MMMM YYYY'),
      sf: hours > 0 ? hours + " Hrs " + mins + "and Mins" : mins + " Mins",
      CC: HR_mail
    };
    triggerMail("Report.html", replacements, bResult.EmailAddress, "Leave & Attendance - " + date.format('MMMM YYYY'));
    // if (aPushId.length) {
    //   var message = {
    //     registration_ids: aPushId,
    //     notification: {
    //       title: 'New Leave Request',
    //       body: aResult.DisplayName + ' applied for leave. Please review and approve.',
    //       click_action: "FCM_PLUGIN_ACTIVITY",
    //     },
    //     data: {
    //       // page: "approve-job",
    //     }
    //   }
    //   triggerPushNotification(message);
    // }
  });
}

function getuserreports(callback, req) {
  pool2.then((pool) => {
    var request = pool.request();
    request.input('Month', mssql.Int, req.body.Month);
    request.input('Year', mssql.Int, req.body.Year);
    request.input('UserId', mssql.Int, req.body.UserId);
    request.execute('sp_GetUserMonthlyReports').then(function (data, recordsets, returnValue, affected) {
      mssql.close();
      callback(null, data.recordset[0]);
    }).catch(function (err) {
      console.log(err);
      res.send(err);
    });
  });
}

function sendMailAfterCancelReq(leaveId, userId) {
  console.log("==========Send Mail After Leave Cancel Req==========");
  console.log(leaveId);
  console.log(userId);
  async.series([
    function (callback) {
      getPostedByUserDetails(callback, userId);
    },
    function (callback) {
      getLeaveDetails(callback, leaveId);
    },
    function (callback) {
      getLeaveApprovers(callback, userId, 0);
    }
  ], function (err, results) {
    var aResult = results[0];
    var bResult = results[1];
    var cResult = results[2].emailId;
    var aPushId = results[2].pushId;
    var names = results[2].names;
    var moment = require('moment');
    // var innertext = '<p style="font-size:16px;line-height:24px;color:#4c4c4c"><strong>' + aResult.DisplayName + '</strong> has applied for leave ' + line + '. Please review and approve.</p>'
    var replacements = {
      username: aResult.DisplayName,
      startdate: moment(bResult.StartDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      endate: moment(bResult.EndDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      LeaveCategoryname: bResult.LeaveCategoryname,
      leaveDetails: bResult,
      // innertext: innertext,
      loginLink: ICS_ADMIN_URL + "/dashboard/leave-requests",
      names: names.join(","),
      CC: HR_mail
    };
    console.log('rep');
    console.log(replacements)
    triggerMail("cancel-request.html", replacements, cResult.join(","), "Leave Cancellation Request");
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



function sendMailAfterApproveCancellation(userId, leaveId) {
  console.log("==========Send Mail After Approve Cancellation==========");
  console.log(userId);
  console.log(leaveId);
  var result1;//leave details
  var result2;//approvers
  async.waterfall([
    function (callback) {
      getLeaveApproverDetails(callback, leaveId);
    },
    function (bResult, callback) {
      console.log('bResult')
      console.log(bResult)
      result2 = bResult;
      console.log('---------------------')
      getLeaveDetails(callback, leaveId);
    },
    function (aResult, callback) {
      console.log('aResult')
      console.log(aResult)
      result1 = aResult;
      console.log('---------------------')
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
    var approver = result2.find((x) => {
      return x.UserId == userId;
    })
    var pendingApprover = [];
    if (approver.Status == 1 && result1.Status != 4) {
      result2.forEach((x) => {
        if (x.Status == 4) {
          pendingApprover.push(x.DisplayName);
        }
      })
    }
    var bResult = results;
    var moment = require('moment');
    var replacements = {
      from: moment(result1.StartDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      to: moment(result1.EndDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      bResult: bResult,
      aResult: results,
      LeaveDetails: result1,
      approved: approver.Status == 1 ? true : false,
      pendingApprover: pendingApprover.join(','),
      approver: approver,
      CC: HR_mail
    };
    var subject;
    triggerMail("cancel-approval.html", replacements, aResult.join(","), "Your Leave Cancellation has been updated by " + approver.DisplayName);
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

  });
};


function sendMailAfterRegWfhAdded(wfhId, userId) {
  console.log("==========Send Mail After Wfh Reg Added==========");
  console.log(wfhId);
  console.log(userId);
  async.series([
    function (callback) {
      getPostedByUserDetails(callback, userId);
    },
    function (callback) {
      getWfhRegDetails(callback, wfhId);
    },
    function (callback) {
      getWfhApprovers(callback, userId);
    }
  ], function (err, results) {
    var aResult = results[0];// user details
    var bResult = results[1];// wfh details
    var cResult = results[2].emailId;
    var aPushId = results[2].pushId;
    var names = results[2].names;
    var line = undefined
    var oneday = false;
    if (moment(bResult.EndDate, 'YYYY-MM-DD HH:mm:ss').format("MM-DD-YYYY") == moment(bResult.StartDate, 'YYYY-MM-DD HH:mm:ss').format("MM-DD-YYYY")) {
      oneday = true;
    }
    var Task = [];
    Task = bResult.TaskList;
    let s = 1;
    Task.forEach((x) => {
      var h = x.Hours / 60 | 0;
      var m = x.Hours % 60 | 0;
      x.time = h + " Hours " + m + " Minutes";
      x.bill = x.Billable == 0 ? 'No' : 'Yes';
      x.sr = s;
      s++;
    })
    console.log('Tasks');
    console.log(bResult.TaskList)
    console.log(Task)

    var replacements = {
      username: aResult.DisplayName,
      line: line,
      startdate: moment(bResult.StartDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      endate: moment(bResult.EndDate, 'YYYY-MM-DD HH:mm:ss').utc().format('Do MMMM YYYY'),
      oneday: oneday,
      loginLink: ICS_ADMIN_URL + "/dashboard/wfh-request",
      WfhDetails: bResult,
      names: names.join(","),
      CC: HR_mail,
      TaskList: Task,
    };

    triggerMail("wfh-reg-created.html", replacements, cResult.join(","), "Work from home Regularization request");
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

function triggerMail(tmplName, replacements, to, subject, attachments) {
  readHTMLFile("./__mail_templates/" + tmplName, function (err, html) {
    var template = handlebars.compile(html);
    var htmlToSend = template(replacements);
    console.log("list of ppl" + to);
    // setup email data with unicode symbols
    var mailOptions = {
      from: '"Infinite Computing Systems " <no-reply@infinite-usa.com>', // sender address
      to: to, // list of receivers
      // to: 'djdsouza@infinite-usa.com',
      subject: subject, // Subject line
      html: htmlToSend
    };
    if (replacements.CC) {
      mailOptions.cc = replacements.CC;
    }
    // console.log(replacements);

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
exports.sendReportToUser = sendReportToUser;
exports.sendMailAfterCancelReq = sendMailAfterCancelReq;
exports.sendMailAfterApproveCancellation = sendMailAfterApproveCancellation;
exports.sendMailAfterRegWfhAdded = sendMailAfterRegWfhAdded;

module.exports.loadSchema = createSchema;