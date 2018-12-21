var express = require('express');
var router = express.Router();
var uniqueid = require('uniqueid');
var first = uniqueid('Admin')
var multer = require('multer'); // multer handles forms posted to the
// server
var upload = multer();
router.upload = upload;
var mysql = require('mysql');
router.mysql = mysql;

// There is only one group of environmental connection info This group
// becomes a single global object

router.connectinfoENV = getEnvConnectInfo(); /* Whatever env has at
                                               * time of microservice
                                               * startup */
/* GET home page. */

router.sessConnectInfoBuilder = ConnectInfo;

router.get('/', function (req, res, next) {
    req.session.connectInfoSession = new router.sessConnectInfoBuilder(router.connectinfoENV.host,
        router.connectinfoENV.user,
        router.connectinfoENV.password,
        router.connectinfoENV.database,
        first());
    res.render('index', {
        title: "MySQL Session: " + req.session.connectInfoSession.sessionID,
        db_server_ph: req.session.connectInfoSession.host,
        db_login_ph: req.session.connectInfoSession.user,
        db_password_ph: "*****",
        db_database_ph: req.session.connectInfoSession.database
    }, function (err, html) {
        if (err != null) {
            console.log(err);
        } else {
            // html value comes from rendering the Jade template.
            console.log(html);
            res.send(html);
        }
    });
});

router.post('/hostname', upload.none(), function (req, res, next) {
    var cos = addMethodsToConnectionInfoObject(req.session.connectInfoSession);
    // below is not the connectinfo object
    // the values come from the HTTP POST'd form
    var newconnectinfo = {
        host: req.body.servername,
        user: req.body.login,
        password: req.body.password,
        database: req.body.database
    };

    var status = cos.tryToLogin(newconnectinfo, req.body.confirmPassword, res);
    if (status == false) {
        // session defaults were maybe updated but not acceptable for connecting to database
        cos.retryGetDatabaseLoginInfo(res, next); // sends a variant
    }
    // if status return was true, waiting for database server response
});

/* Function to add methods to object*/

function addMethodsToConnectionInfoObject(cio) {
    cio.tryToLogin = tryToLogin;
    cio.isDatabaseStillOK = isDatabaseStillOK;
    cio.isDatabaseOK = isDatabaseOK;
    cio.setLoggedIn = setLoggedIn;
    cio.setConnectInfoTryable = setConnectInfoTryable;
    cio.setCon = setCon;
    cio.retryGetDatabaseLoginInfo = retryGetDatabaseLoginInfo;
    return (cio);
}

//  The object is created per session so that the code can keep track
//  which user is doing what.

/* Constructor */

function ConnectInfo(dbhost, dbuser, dbpassword, dbdatabase, sessionID) {
    this.host = dbhost;
    this.user = dbuser;
    this.password = dbpassword;
    this.database = dbdatabase;
    this.sessionID = sessionID;
    this.dbconnection = null;
    this.isConnectInfoTryable = false;
    this.loggedIn = false;
}

// methods don't seem to be preserved as session objects are passed into http requests. Fortunately,
// the methods can be added later. Probably because during production sessions are stored in database.

/* Methods */

var setLoggedIn = function (status) {
    this.loggedIn = status;
};
var setConnectInfoTryable = function (status) {
    this.isConnectInfoTryable = status;
};

// Save the data structure used to make connection
var setCon = function (connection) {
    this.dbconnection = connection;
};

var tryToLogin = function (newconnectinfo, confirmPassword, res) {
    var cio = this;
    var orires = res;
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

    this.setCon(con);
    this.dbconnection.connect(function (err) {
        // con is object with its own this
        if (err) {
            console.log("Need to retry with new connect info!");
            // different this
            cio.setConnectInfoTryable(false);
            orires.render('index', {title: 'MySQL Reconnect: ' + cio.sessionID},
                function (err, html) {
                    if (err != null) {
                        console.log(err);
                    } else {
                        console.log(html); // the MySQL Login form
                        orires.send(html);
                    }
                });
        } else {
            console.log("Connected to MySQL server!");
            cio.setConnectInfoTryable(true);
            cio.isDatabaseOK(orires);
        }
    });
}

var isDatabaseOK = function (res) {
    // if res is non-null, there is a browser session to which there must be response
    var testingDataBase = asyncErrDomain.create(); // testingDataBase is object
    var oldres = res;
    var cio = this;
    testingDataBase.on('error', function (err) {
        console.log("Could not get to Users datatable.")
        console.log("Is the correct MySQL server selected?")
        cio.setConnectInfoTryable(false);
        cio.setLoggedIn(false);
        if (oldres != null) // remnant of old code?
            oldres.render('index', {title: 'MySQL Reconnect Page: ' + cio.sessionID}, function (err, html) {
                if (err != null) {
                    console.log(err);
                } else {
                    console.log(html); // the MySQL Login form
                    oldres.send(html);
                }
            });
    });

    testingDataBase.run(function () {
        cio.connection.query("show databases;", function (err, result) {
            if (err)
                throw err;
            console.log("Available Databases: ");
            for (idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            cio.connection.query("use " + cio.database + ";", function (err, result) {
                if (err)
                    throw err;
                console.log(result);
                cio.connection.query("show tables;", function (err, result) {
                    if (err)
                        throw err;
                    console.log(result);
                    cio.connection.query("describe Users;", function (err, result) {
                        if (err)
                            throw err;
                        console.log(result);
                        cio.setLoggedIn(true);
                        if (oldres) // remnant of old code?o
                            oldres.render('users', {title: 'Users Management Page: ' + cio.sessionID}, function (err, html) {
                                if (err != null) {
                                    console.log(err);
                                } else {
                                    console.log(html);
                                    oldres.send(html);
                                }
                            });
                    });
                });
            });
        });
    });
}


var isDatabaseStillOK = function (queryinfo, res) {
    var cio = this;
    var altres = res;
    var testingDataBase = asyncErrDomain.create();
    testingDataBase.on('error', function (err) {
        console.log("Connection to Database Server is broken.")
        setConnectInfoTryable(false);
        setLoggedIn(false);
        altres.render('index', {title: 'MySQL Reconnect Page' + cio.sessionID},
            function (err, html) {
                if (err != null) {
                    console.log(err);
                } else {
                    console.log(html); // the MySQL Login form
                    altres.send(html);
                }
            });
    });

    testingDataBase.run(function () {
        cio.connection.query("show databases;", function (err, result) {
            if (err)
                throw err;
            console.log("Available Databases: ");
            for (idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            cio.query("use " + cio.database + ";", function (err, result) {
                if (err)
                    throw err;
                console.log(result);
                cio.query("show tables;", function (err, result) {
                    if (err)
                        throw err;
                    console.log(result);
                    cio.connection.query("describe Users;", function (err, result) {
                        if (err)
                            throw err;
                        console.log(result);
                        setLoggedIn(true);

                        if (queryinfo.button_create != null) {
                            mysql_create(query_info, cio.connection);
                            altres.render('users', {title: 'User Create Page: ' + cio.sessionID}, function (err, html) {
                                if (err != null) {
                                    console.log(err);
                                } else {
                                    console.log(html);
                                    altres.send(html);
                                }
                            });
                        } else if (queryinfo.button_edit != null) {
                            mysql_update(query_info, cio.connection);
                            altres.render('users', {title: 'User View Page: ' + cio.sessionID}, function (err, html) {
                                if (err != null) {
                                    console.log(err);
                                } else {
                                    console.log(html);
                                    res.send(html);
                                }
                            });
                        } else {
                            mysql_view(query_info, cio.connection);
                            altres.render('users', {title: 'User Display Page: ' + cio.sessionID}, function (err, html) {
                                if (err != null) {
                                    console.log(err);
                                } else {
                                    console.log(html);
                                    altres.send(html);
                                }
                            });
                        }
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
    console.log(this.toString());
    res.render('index', {
        title: "MySQL Try Again: " + this.sessionID,
        db_server_ph: this.host,
        db_login_ph: this.user,
        db_password_ph: "*****", /* should indicate presence of default */
        db_database_ph: this.database
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

module.exports = router;
