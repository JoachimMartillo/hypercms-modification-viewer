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
    if (req.body.password !== req.body.confirmPassword) {
        req.session.connectInfoSession.retryGetDatabaseLoginInfo(req, res, next); // sends a variant
        // of webstart form
        return;
    }
    // below is not the connectinfo object
    // the values come from the form
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
    status = req.session.connectInfoSession.tryToLogin(newconnectinfo, req, res);
    if (status == false) {
        // session defaults were updated but not acceptable for connecting to database
        req.session.connectInfoSession.retryGetDatabaseLoginInfo(req, res, next); // sends a variant
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
        button_create: req.body.button_create,
        button_view: req.body.button_view,
        button_edit: req.body.button_edit
    };
    isDatabaseStillOK(connectinfo.connection, queryinfo, res);
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
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// It may be clearer to group the env operations inn this way
// I may have to add some null fields.

function ConnectInfo(dbhost, dbuser, dbpassword, dbdatabase) {
    this.host = dbhost;
    this.user = dbuser;
    this.password = dbpassword;
    this.database = dbdatabase;
    this.isConnectInfoTryable = false;
    this.loggedIn = false;
    this.setLoggedIn = function (status) {
        this.loggedIn = status;
    };
    this.setConnectInfoTryable = function (status) {
        this.isConnectInfoTryable = status;
    };

    this.setCon = function (connection) {
        this.connection = connection;
    };

    this.tryToLogin = function (newconnectinfo, req, res) {
        // newconnectinfo came from the latest submitted form.
        // it must be checked for minimal sanity.
        // "" does not override a valid string.
        this.loggedIn = false;
        if(newconnectioninfo.host != "")
            this.host =
            if(newconnectioninfo.dbuser != "")
		this.user = newconnectioninfo.user;
        if(newconnectioninfo.user != "")
            this.password = newconnectioninfo.user;
        if(newconnectioninfo.database != "")
            this.database = newconnectioninfo.database;

        this.isConnectInfoTryable = false;
        if((this.host == "") || (this.user == "") || (this.password == "") || (this.database == ""))
            return false; /* cannot try the connection, need more info */
        this.isConnectInfoTryable = true;
        var con = mysql.createConnection({
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database
        });

        // we have no reason to doubt these parameters -- we
        // update the per browser session parameters

        // note that connection info may be valid but connection
        // may fail

        setCon(newconnectinfo, con);

        con.connect(function (err) {
            if (err) {
                console.log("Need to retry with new connect info!");
                this.setConnectInfoTryable(false);
                app.use('/', webStart);
                if (res)
                    res.render('index', {title: 'MySQL Login Page'},
                               function (err, html) {
				   if (err != null) {
                                       console.log(err);
				   } else {
                                       console.log(html); // the MySQL Login form
                                       res.send(html);
				   }
                               });
            } else {
                console.log("Connected to MySQL server!");
                setConnectInfoTryable(true);
                this.isDatabaseOK(con, res);
            }
        });
    }

    this.isDatabaseStillOK = function (con, queryinfo, res) {
        var testingDataBase = asyncErrDomain.create();
        testingDataBase.on('error', function (err) {
            console.log("Connection to Database Server is broken.")
            setConnectInfoTryable(false);
            setLoggedIn(false);
            app.use('/', webStart);
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
            con.query("show databases;", function (err, result) {
                if (err)
                    throw err;
                console.log("Available Databases: ");
                for (idb = 0; idb < result.length; ++idb) {
                    console.log(result[idb]);
                }
                con.query("use " + connectinfo.database + ";", function (err, result) {
                    if (err)
                        throw err;
                    console.log(result);
                    con.query("show tables;", function (err, result) {
                        if (err)
                            throw err;
                        console.log(result);
                        con.query("describe Users;", function (err, result) {
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
                                mysql_view(query_info, connectinfo.connection);
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

    this.isDatabaseOK = function (connectinfo, con, res) {
        // if res is non-null, there is a browser sess to which there must be response
        var testingDataBase = asyncErrDomain.create();
        testingDataBase.on('error', function (err) {
            console.log("Could not get to Users datatable.")
            console.log("Is the correct MySQL server selected?")
            setConnectInfoTryable(connectinfo, false);
            setLoggedIn(connectinfo, false);
            app.use('/', webStart);
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
            con.query("show databases;", function (err, result) {
                if (err)
                    throw err;
                console.log("Available Databases: ");
                for (idb = 0; idb < result.length; ++idb) {
                    console.log(result[idb]);
                }
                con.query("use " + connectinfo.database + ";", function (err, result) {
                    if (err)
                        throw err;
                    console.log(result);
                    con.query("show tables;", function (err, result) {
                        if (err)
                            throw err;
                        console.log(result);
                        con.query("describe Users;", function (err, result) {
                            if (err)
                                throw err;
                            console.log(result);
                            setLoggedIn(connectinfo, true);
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
    // did not update the session specific paramets with data
    // entered from browser.
    
    function retryGetDatabaseLoginInfo(req, res, next) {
        var sessData = req.session;
        res.render('index', {
            title: "MySQL Try Again: " + sessData.sessionID,
            db_server_ph: sessData.connectInfoSession.host,
            db_login_ph: sessData.connectInfoSession.user,
            db_password_ph: "*****",
            db_database_ph: sessData.connectInfoSession.database
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
}

// This function is global. There is only one group of environment connection parameters,
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

module.exports = app;
