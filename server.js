var mssql = require('mssql'),
    async = require("async"),
    fs = require('fs-extra'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    cors = require('cors');

global.__basedir = __dirname;
// Allow urls from this array only
var whitelist = ['http://localhost:4200', 'http://localhost:5200', 'http://localhost:4300'];
var PORT =  8089;
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

// app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(bodyParser.urlencoded({
    extended: true
}));

const schemaFolder = './__ent/';
fs.readdir(schemaFolder, function (err, files) {
    async.eachSeries(files, function (file, next) {
        console.log("Loading Schema from " + file);
        var schemaObject = require(schemaFolder + file);
        if (typeof (schemaObject.loadSchema) == "function") {
            schemaObject.loadSchema(app, mssql, pool, fs);
        }
        next();
    });
});

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
const pool = new mssql.ConnectionPool(config).connect().then(pool => {
    console.log('Connected to MSSQL')
    return pool
}).catch(err => console.log('Database Connection Failed! Bad Config: ', err));


// default route
app.get('/', function (req, res) {
    return res.send({ error: true, message: 'hello' })
});

// port must be set to 8080 because incoming http requests are routed from port 80 to port 8080
app.listen(PORT, function () {
    console.log('Node app is running on port '+ PORT);
});
