var nodemailer = require('nodemailer');
var fs = require('fs');
var handlebars = require('handlebars');

var transporter = nodemailer.createTransport({
    host: 'mail.infinite-usa.com',
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
    fs.readFile(path, { encoding: 'utf-8' }, function (err, html) {
        if (err) {
            throw err;
            callback(err);
        }
        else {
            callback(null, html);
        }
    });
};

exports.getJobApproverUsers = function (mssql, pool2, postedById) {
    pool2.then((pool) => {
        var request = pool.request();
        request.execute('sp_GetJobApproverUsers').then(function (data, recordsets, returnValue, affected) {
            mssql.close();
            var __o = data.recordset;
            var emailId = [];
            if (__o.length) {
                for (var i = 0; i < __o.length; i++) {
                    if (__o[i].UserId != postedById) {
                        emailId.push(__o[i].EmailAddress);
                    }
                }
            }
            console.log(emailId);
            console.log(data);
            sendMailAfterJobAdd(emailId);
        }).catch(function (err) {
            console.log(err);
        });
    });
}

var sendMailAfterJobAdd = function (emailId) {
    readHTMLFile('./__mail_templates/job-created.html', function (err, html) {
        var template = handlebars.compile(html);
        var replacements = {
            username: "John Doe"
        };
        var htmlToSend = template(replacements);

        // setup email data with unicode symbols
        var mailOptions = {
            from: '"Infinite Computing Systems " <no-reply@infinite-usa.com>', // sender address
            to: emailId.join(','), // list of receivers
            subject: 'Job Approval', // Subject line
            html: htmlToSend,
        };
        console.log(mailOptions);
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            console.log('Mail Sent to: %s', emailId.join(','));    
        });
    });

   
}
