var express = require('express'); // I probably use too many
// semicolons
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var asyncErrDomain = require('domain');
// This may not be the best library

var webStart = require('./routes/index');
var userManage = require('./routes/users');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

// There is only one group of environmental connection info This group
// becomes a single global object

var connectInfoFromEnv = getEnvConnectInfo();

// I think only the database connection info & the actual connection
// needs to be stored in the session data Default database server,
// database user, database password can be grabbed from environment
// Different users of this microservice should be able to log into
// different databases.

//set up webStart object, which handles web login to MySQL server.

webStart.userManage = userManage;
webStart.connectinfoENV = connectInfoFromEnv; /* Whatever env has at
                                               * time of microservice
                                               * startup */

webStart.sessConnectInfoBuilder = ConnectInfo;

//set up userManage object, which handles viewing or modifying Users
//data table.
userManage.webStart = webStart; // so that we can get to db login
// screen if not already logged in
userManage.connectinfoENV = connectInfoFromEnv; /* Whatever env has at
                                                 * time of
                                                 * microservice
                                                 * startup */

userManage.sessConnectInfoBuilder = ConnectInfo;

var app = express(); // this is the basic express app routing engine

var multer = require('multer'); // multer handles forms posted to the
// server
var upload = multer();

var mysql = require('mysql');

// just like to know start time -- I always add this line for logging
var dateString = new Date().toUTCString();
console.log('Starting server at ' + dateString); // print out start time to console

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// I still don't understand how to use favicon app.use(favicon());

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: 'this-is-a-secret-token', cookie: {maxAge: 60000}}));

// set up routes

app.use('/', webStart);
app.use('/userdisplay', userManage);

// This route processes the incoming connection data -- the user may
// punt to defaults

app.post('/hostname', upload.none(), function (req, res, next) {
    var status = false;
    var cos = req.session.connectInfoSession;

    // these two following lines seem to contain some redundancies.
    cos = addMethodsToConnectionInfoObject(cos);
    req.session.connectInfoSession = cos;

    // below is not the connectinfo object
    // the values come from the HTTP POST'd form
    var newconnectinfo = {
        host: req.body.servername,
        user: req.body.login,
        password: req.body.password,
        database: req.body.database
    };
    var status = false;


    // in theory the received form contains login data
    // I should probably implement a complete connectinfo object
    // that includes login method
    // only tryToLogin can actually change the ConnectInfo parameters
    // tryToLogin can add the database connection to the session ConnectInfo
    status = cos.tryToLogin(newconnectinfo, req.body.confirmPassword, res);
    if (status == false) {
        // session defaults were maybe updated but not acceptable for connecting to database
        cos.retryGetDatabaseLoginInfo(res, next); // sends a variant
    }
    // if status return was true, waiting for database server response
});

app.post('/usermanagement', upload.none(), function (req, res, next) {
    var queryinfo = {
        email: req.body.email,
        hcmspassword: req.body.hcmspassword,
        confirmPassword: req.body.confirmPassword,
        lastname: req.body.lastname,
        firstname: req.body.firstname,
        middlename: req.body.middlename,
        phone: req.body.phone,
        jobTitle: req.body.jobTitle,
        role: req.body.role,
        button_create: req.body.button_create,
        button_view: req.body.button_view,
        button_edit: req.body.button_edit
    };
    req.session.connectInfoSession.isDatabaseStillOK(queryinfo, res);
});

/// catch 404 and forwarding to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err // I guess this line forces the stack trace
        });
    });
}

// production error handler
// no stack traces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

/* Functions */

// There is only one group of environment connection parameters,
// which can be overridden.

function getEnvConnectInfo() {
    var temp = null;
    return {
        host: ((temp = process.env.CMSDBHOST) === undefined ? "" : temp),
        user: ((temp = process.env.CMSDBUSER) === undefined ? "" : temp),
        password: ((temp = process.env.CMSDBPASSWORD) === undefined ? "" : temp),
        database: ((temp = process.env.CMSDBDATABASE) === undefined ? "" : temp)
    };
}

/* Function to add methods to object*/

function addMethodsToConnectionInfoObject(coi) {
    coi.tryToLogin = tryToLogin;
    coi.isDatabaseStillOK = isDatabaseStillOK;
    coi.isDatabaseOK = isDatabaseOK;
    coi.setLoggedIn = setLoggedIn;
    coi.setConnectInfoTryable = setConnectInfoTryable;
    coi.setCon = setCon;
    coi.retryGetDatabaseLoginInfo = retryGetDatabaseLoginInfo;
    return (coi);
}

//  The object is created per session so that the code can keep track
//  which user is doing what.

/* Constructor */

function ConnectInfo(dbhost, dbuser, dbpassword, dbdatabase) {
    this.host = dbhost;
    this.user = dbuser;
    this.password = dbpassword;
    this.database = dbdatabase;
    this.isConnectInfoTryable = false;
    this.loggedIn = false;
}

// methods don't seem to be preserved as session objects are passed into http requests. Fortunately,
// the methods can be added later.


/* Methods */

var setLoggedIn = function (status) {
    this.loggedIn = status;
};
var setConnectInfoTryable = function (status) {
    this.isConnectInfoTryable = status;
};

// Save the data structure used to make connection
var setCon = function (connection) {
    this.connection = connection;
};

var tryToLogin = function (newconnectinfo, confirmPassword, res) {
    // newconnectinfo came from the latest submitted form.
    // it must be checked for minimal sanity.
    // "" does not override a valid string.
    this.loggedIn = false;
    // The following overrides the environment.
    if (newconnectinfo.host != "")
        this.host = newconnectinfo.host;
    if (newconnectinfo.user != "")
        this.user = newconnectinfo.user;
    if (newconnectinfo.password != "")
        this.password = newconnectinfo.password;
    if (newconnectinfo.database != "")
        this.database = newconnectinfo.database;

    this.isConnectInfoTryable = false;
    if ((confirmPassword != "") && (this.password != confirmPassword))
        return false;
    if ((this.host == "") || (this.user == "") || (this.password == "") || (this.database == ""))
        return false; /* cannot try the connection, need more info */

    this.isConnectInfoTryable = true;
    var con = mysql.createConnection({
        host: this.host,
        user: this.user,
        password: this.password,
        database: this.database
    });
    var sessionStore = new MySQLStore({}, con);
    // con is an object associated with its own methods -- have to save current object in con
    sessionStore.connectInfoSession = this;
    sessionStore.res = res;		// need to save browser response object too
    // we are not responding to mysql database

    // we have no reason to doubt these parameters -- we
    // update the per browser session parameters

    // note that connection info may be valid but connection
    // may fail

    this.setCon(con);
    con.connect(function (err) {
        if (err) {
            console.log("Need to retry with new connect info!");
            // different this
            this.connectInfoSession.setConnectInfoTryable(false);
            if (this.res)
                this.res.render('index', {title: 'MySQL Reconnect'},
                    function (err, html) {
                        if (err != null) {
                            console.log(err);
                        } else {
                            console.log(html); // the MySQL Login form
                            this.res.send(html);
                        }
                    });
        } else {
            console.log("Connected to MySQL server!");
            this.connectInfoSession.setConnectInfoTryable(true);
            this.connectInfoSession.isDatabaseOK(res);
        }
    });
}

var isDatabaseStillOK = function (queryinfo, res) {
    var testingDataBase = asyncErrDomain.create();
    testingDataBase.on('error', function (err) {
        console.log("Connection to Database Server is broken.")
        setConnectInfoTryable(false);
        setLoggedIn(false);
        res.render('index', {title: 'MySQL Reconnect Page'},
            function (err, html) {
                if (err != null) {
                    console.log(err);
                } else {
                    console.log(html); // the MySQL Login form
                    res.send(html);
                }
            });
    });

    testingDataBase.run(function () {
        this.connection.query("show databases;", function (err, result) {
            if (err)
                throw err;
            console.log("Available Databases: ");
            for (idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            this.connection.query("use " + connectinfo.database + ";", function (err, result) {
                if (err)
                    throw err;
                console.log(result);
                this.connection.query("show tables;", function (err, result) {
                    if (err)
                        throw err;
                    console.log(result);
                    this.connection.query("describe Users;", function (err, result) {
                        if (err)
                            throw err;
                        console.log(result);
                        setLoggedIn(true);

                        if (queryinfo.button_create != null) {
                            mysql_create(query_info, connectinfo.connection);
                            res.render('users', {title: 'User Create Page'}, function (err, html) {
                                if (err != null) {
                                    console.log(err);
                                } else {
                                    console.log(html);
                                    res.send(html);
                                }
                            });
                        } else if (queryinfo.button_edit != null) {
                            mysql_update(query_info, connectinfo.connection);
                            res.render('users', {title: 'User View Page'}, function (err, html) {
                                if (err != null) {
                                    console.log(err);
                                } else {
                                    console.log(html);
                                    res.send(html);
                                }
                            });
                        } else {
                            mysql_view(query_info, this.connection);
                            res.render('users', {title: 'User Display Page'}, function (err, html) {
                                if (err != null) {
                                    console.log(err);
                                } else {
                                    console.log(html);
                                    res.send(html);
                                }
                            });
                        }
                    });
                });
            });
        });
    });
}

var isDatabaseOK = function (res) {
    // if res is non-null, there is a browser session to which there must be response
    var testingDataBase = asyncErrDomain.create();
    testingDataBase.on('error', function (err) {
        console.log("Could not get to Users datatable.")
        console.log("Is the correct MySQL server selected?")
        setConnectInfoTryable(false);
        setLoggedIn(false);
        if (res != null)
            res.render('index', {title: 'MySQL Reconnect Page'}, function (err, html) {
                if (err != null) {
                    console.log(err);
                } else {
                    console.log(html); // the MySQL Login form
                    res.send(html);
                }
            });
    });

    testingDataBase.run(function () {
        this.connectinfo.query("show databases;", function (err, result) {
            if (err)
                throw err;
            console.log("Available Databases: ");
            for (idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            this.connectinfo.query("use " + this.database + ";", function (err, result) {
                if (err)
                    throw err;
                console.log(result);
                this.connectinfo.con.query("show tables;", function (err, result) {
                    if (err)
                        throw err;
                    console.log(result);
                    this.connectinfo.query("describe Users;", function (err, result) {
                        if (err)
                            throw err;
                        console.log(result);
                        setLoggedIn(true);
                        if (res)
                            res.render('users', {title: 'Users Management Page'}, function (err, html) {
                                if (err != null) {
                                    console.log(err);
                                } else {
                                    console.log(html);
                                    res.send(html);
                                }
                            });
                    });
                });
            });
        });
    });
}

// passwords did not agree -- other parameters might be bad
// did not update the session specific parameters with data
// entered from browser.

var retryGetDatabaseLoginInfo = function (res, next) {
    console.log(this.session.connectInfoSession.toString());
    res.render('index', {
        title: "MySQL Try Again: " + this.sessionID,
        db_server_ph: this.connectInfoSession.host,
        db_login_ph: this.connectInfoSession.user,
        db_password_ph: "*****", /* should indicate presence of default */
        db_database_ph: this.connectInfoSession.database
    }, function (err, html) {
        if (err != null) {
            console.log(err);
        } else {
            // html value comes from rendering the Jade template.
            console.log(html);
            res.send(html);
        }
    });
}

module.exports = app;
