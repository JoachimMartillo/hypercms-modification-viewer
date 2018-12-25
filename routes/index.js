var express = require('express');
var router = express.Router();
var uniqueid = require('uniqueid');
var first = uniqueid('Admin')
var multer = require('multer'); // multer handles forms posted to the
// server
var upload = multer();
var mysql = require('mysql');
var asyncErrDomain = require('domain');

// There is only one group of environmental connection info This group
// becomes a single global object
router.connectinfoENV = getEnvConnectInfo();
router.sessConnectInfoBuilder = ConnectInfo;
/* Helpful to have session specific methods */
router.addMethodsToConnectionInfoObject = addMethodsToConnectionInfoObject;
/* unfortunately res.send tries to turn them into json if they are present*/
router.stripMethodsFromConnectionInfoObject = stripMethodsFromConnectionInfoObject;

/* Setting up routes callbacks */
router.get('/', function (req, res, next) {
    var cio = req.session.connectInfoSession = new router.sessConnectInfoBuilder(router.connectinfoENV.host,
        router.connectinfoENV.user,
        router.connectinfoENV.password,
        router.connectinfoENV.database,
        first(), false, false, null);
    cio = router.addMethodsToConnectionInfoObject(req.session.connectInfoSession);

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
            sendResponseWithCorrectSessionData(res, html, cio);
        }
    });
});

router.post('/hostname', upload.none(), function (req, res, next) {
    var cio = router.addMethodsToConnectionInfoObject(req.session.connectInfoSession);
    // below is not the connectinfo object
    // the values come from the HTTP POST'd form
    var newconnectinfo = {
        host: req.body.servername,
        user: req.body.login,
        password: req.body.password,
        database: req.body.database
    };

    var status = cio.tryToLogin(newconnectinfo, req.body.confirmPassword, res);
    if (status == false) {
        // session defaults were maybe updated but not acceptable for connecting to database
        cio.retryGetDatabaseLoginInfo(res, next); // sends a variant
    }
    // if status return was true, waiting for database server response
});

/* We don't have to use a POST for this route. The jade/pug file could be written to use a GET */
router.post('/dbpause', upload.none(), function (req, res, next) {
    var cio = router.addMethodsToConnectionInfoObject(req.session.connectInfoSession);
    var whattodo = {
        cancel: req.body.button_cancel,
        continue: req.body.button_continue
    }
    if (whattodo.cancel != "") /* i.e. continue */{
        try {
            req.session.destroy(function (err) {
                // cannot access session here
                if (err) {
                    console.log(err);
                } else {
                    res.render('restart', {
                        title: "New Session",
                        url: '/'
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
            });
        } catch(error) {
            console.log("Some errors may be specific to development: " + error);
        //    Should the program exit?
        }
    } else if (cio.getLoggedIn()) {

    } else {

    }
});

/* special send function */
function sendResponseWithCorrectSessionData(res, html, cio) {
    res.req.session.connectInfoSession =
        router.stripMethodsFromConnectionInfoObject(res.req.session.connectInfoSession);
    res.send(html);
    res.req.session.connectInfoSession = cio;
}

/* Function to add methods to object*/

function addMethodsToConnectionInfoObject(cio) {
    cio.tryToLogin = tryToLogin;
    cio.isDatabaseOK = isDatabaseOK;
    cio.setLoggedIn = setLoggedIn;
    cio.setConnectInfoTryable = setConnectInfoTryable;
    cio.getLoggedIn = getLoggedIn;
    cio.getConnectInfoTryable = getConnectInfoTryable;
    cio.retryGetDatabaseLoginInfo = retryGetDatabaseLoginInfo;
    cio.setRoles = setRoles;
    cio.getRoles = getRoles;
    return (cio);
}

/* Maybe I should create getters for all the fields. */
function stripMethodsFromConnectionInfoObject(cio) {
    return new ConnectInfo(cio.host, cio.user, cio.password,
        cio.database, cio.sessionID,
        cio.getConnectInfoTryable(), cio.getLoggedIn(), cio.roles);
}

//  The object is created per session so that the code can keepWaiting for Database Check to Finish track
//  which user is doing what.

/* Constructor */

function ConnectInfo(dbhost, dbuser, dbpassword, dbdatabase, sessionID, isConnectInfoTryable, loggedIn, roles) {
    this.host = dbhost;
    this.user = dbuser;
    this.password = dbpassword;
    this.database = dbdatabase;
    this.sessionID = sessionID;
    this.isConnectInfoTryable = isConnectInfoTryable;
    this.loggedIn = loggedIn;
    this.roles = roles;
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

var getLoggedIn = function (status) {
    return (this.loggedIn);
};
var getConnectInfoTryable = function (status) {
    return (this.isConnectInfoTryable);
};

var setRoles = function (tables) {
    this.roles = tables;
}

var getRoles = function (tables) {
    return this.roles;
}

var tryToLogin = function (newconnectinfo, confirmPassword, res) {
    var cio = this;
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
    con.connect(function (err) {
        // con is object with its own this
        if (err) {
            console.log(err);
            console.log("Need to retry with new connect info!");
            // different this
            cio.setConnectInfoTryable(false);
            res.render('index', {title: 'MySQL Reconnect: ' + cio.sessionID},
                function (err, html) {
                    if (err != null) {
                        console.log(err);
                    } else {
                        console.log(html); // the MySQL Login form
                        sendResponseWithCorrectSessionData(res, html, cio);
                    }
                });
        } else {
            console.log("Connected to MySQL server!");
            cio.setConnectInfoTryable(true);
            cio.isDatabaseOK(con, res);
            if (cio.loggedIn) {
                res.render('users', {title: 'Choose User ' + cio.sessionID},
                    function (err, html) {
                        if (err != null) {
                            console.log(err);
                        } else {
                            console.log(html); // the MySQL Login form
                            sendResponseWithCorrectSessionData(res, html, cio);
                        }
                    });
            } else {
                res.render('dbpause', {title: 'Check Database: ' + cio.sessionID},
                    function (err, html) {
                        if (err != null) {
                            console.log(err);
                        } else {
                            console.log(html); // the MySQL Login form
                            sendResponseWithCorrectSessionData(res, html, cio);
                        }
                    });
            }
        }
    });
}

var isDatabaseOK = function (con, res) {
    // if res is non-null, there is a browser session to which there must be response
    var testingDataBase = asyncErrDomain.create(); // testingDataBase is object
    var cio = this;
    testingDataBase.on('error', function (err) {
        console.log("Could not get to Users datatable.")
        console.log("Is the correct MySQL server selected?")
        cio.setConnectInfoTryable(false);
        cio.setLoggedIn(false);
        if (res != null) // remnant of old code?
            res.render('index', {title: 'MySQL Reconnect Page: ' + cio.sessionID}, function (err, html) {
                if (err != null) {
                    console.log(err);
                } else {
                    console.log(html); // the MySQL Login form
                    sendResponseWithCorrectSessionData(res, html, cio);
                }
            });
    });
    // we depend on the closure for the correct con object
    testingDataBase.run(function () {
        // This should be rewritten as chained promises
        con.query("show databases;", function (err, result) {
            if (err) {
                console.log("No databases!")
                throw err;
            }
            console.log("Available Databases: ");
            for (var idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            con.query("use " + cio.database + ";", function (err, result) {
                if (err) {
                    console.log("Unable to use specified database: " + cio.database + "!");
                    throw err;
                }
                console.log(result);
                con.query("show tables;", function (err, result) {
                    if (err) {
                        console.log("Unable to show tables!");
                        throw err;
                    }
                    console.log(result);
                    con.query("describe Roles;", function (err, result) {
                        if (err) {
                            console.log("Unable to describe Roles!");
                            throw err;
                        }
                        console.log(result);
                        con.query("select * from Roles;", function (err, result) {
                            if (err) {
                                console.log("No databases!")
                                throw err;
                            }
                            cio.setRoles(result);/* should be okay -- we are past error */
                            console.log("Available Roles: ");
                            var roles = "";
                            for (var idb = 0; idb < result.length; ++idb) {
                                console.log(result[idb]);
                                roles += result[idb];
                            }
                            con.query("describe Users;", function (err, result) {
                                if (err) {
                                    console.log("Unable to describe Users!");
                                    throw err;
                                }
                                console.log(result);
                                cio.setLoggedIn(true);
                            });
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
            sendResponseWithCorrectSessionData(res, html, cio);
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
