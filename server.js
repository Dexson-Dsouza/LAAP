var mssql = require('mssql'),
    async = require("async"),
    fs = require('fs'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    cors = require('cors');

// Allow urls from this array only
var whitelist = ['http://localhost:4200', 'http://localhost:5200', 'http://localhost:4300'];

var corsOptions = {
    origin: function (origin, callback) {
        console.log(origin);
        if (typeof (origin) == "undefined" || origin.indexOf("file") !== -1 || origin.indexOf("chrome-extension") !== -1) {
            origin = 'http://localhost:3000';
        }
        var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(originIsWhitelisted ? null : 'Bad Request', originIsWhitelisted);
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(bodyParser.urlencoded({
    extended: true
}));


var config = {
    user: 'sa',
    password: 'Infinite123#',
    server: 'INMDCD0212',
    port: 1433,
    database: 'Infinite_Centralized_DB',
    options: {
        encrypt: false
    }
};
const pool = new mssql.ConnectionPool(config).connect();

const schemaFolder = './ent/';
fs.readdir(schemaFolder, function (err, files) {
    async.eachSeries(files, function (file, next) {
        console.log("Loading Schema from " + file);
        var schemaObject = require(schemaFolder + file);
        if (typeof (schemaObject.loadSchema) == "function") {
            schemaObject.loadSchema(app, mssql, pool);
        }
        next();
    });
});


// default route
app.get('/', function (req, res) {
    return res.send({ error: true, message: 'hello' })
});

// port must be set to 8080 because incoming http requests are routed from port 80 to port 8080
app.listen(8080, function () {
    console.log('Node app is running on port 8080');
});


var ActiveDirectory = require('activedirectory');
var adConfig = {
    url: 'ldap://ics.global',
    baseDN: 'dc=ics,dc=global',
    username: 'sbhoybar@ics.global',
    password: 'shriniwas@456'
}

app.get('/getDir', (req, res) => {
    console.log("alal")
    var username = 'sbhoybar@ics.global';
    var password = 'shriniwas@456';


    var ad = new ActiveDirectory(adConfig);
    ad.userExists(username, function (err, exists) {
        if (err) {
            console.log('ERROR: ' + JSON.stringify(err));
            return;
        }
        console.log(username + ' exists: ' + exists);
    });

})

app.get('/getUsers', (req, res) => {
    var query = {
        filter: '(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(givenName=*))',
        attributes: ['mail',
            'userPrinicipalName',
            'st',
            'l',
            'department',
            'company',
            'title',
            'co',
            'telephoneNumber',
            'employeeNumber',
            'mobile',
            'sAMAccountName',
            'givenName',
            'displayName',
            'picture',
            'sn',
            'dn']
    }
    // var query = 
    var ad = new ActiveDirectory(adConfig);
    ad.findUsers(query, true, function (err, users) {
        if (err) {
            console.log('ERROR: ' + JSON.stringify(err));
            return;
        }

        if ((!users) || (users.length == 0)) console.log('No users found.');
        else {
            //    console.log('findUsers: '+JSON.stringify(users));
            res.send(users);
        }
    });

})

app.get('/getUserDetails', (req, res) => {

    var attributes = {
        user: [
            'mail',
            'userPrinicipalName',
            'st',
            'l',
            'department',
            'company',
            'title',
            'co',
            'telephoneNumber',
            'employeeNumber',
            'mobile',
            'sAMAccountName',
            'givenName',
            'displayName',
            'picture',
            'sn',
            'dn'
        ]
    }
    var sAMAccountName = 'abhol';
    var userPrincipalName = 'hbhambure@infinite-usa.com';
    var dn = '(sAMAccountName="+sAMAccountName+")';
    adConfig.attributes = attributes;
    // Find user by a sAMAccountName
    var ad = new ActiveDirectory(adConfig);
    ad.findUser(sAMAccountName, function (err, user) {
        if (err) {
            console.log('ERROR: ' + JSON.stringify(err));
            return;
        }

        if (!user) console.log('User: ' + sAMAccountName + ' not found.');
        else {
            console.log(JSON.stringify(user));
            res.send(user)
        };
    });
})
