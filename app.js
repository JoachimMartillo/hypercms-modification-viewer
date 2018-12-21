var express = require('express'); // I probably use too many
// semicolons
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Promise = require('promise'); // Promise may make domain unnecessary
var asyncErrDomain = require('domain');
// This may not be the best library

var webStart = require('./routes/index');
var userManage = require('./routes/users');
var session = require('express-session');
// Not Needed
// var MySQLStore = require('express-mysql-session')(session);



// I think only the database connection info & the actual connection
// needs to be stored in the session data Default database server,
// database user, database password can be grabbed from environment
// Different users of this microservice should be able to log into
// different databases.

//set up webStart object, which handles web login to MySQL server.

webStart.userManage = userManage;

//set up userManage object, which handles viewing or modifying Users
//data table.
var app = express(); // this is the basic express app routing engine
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
// punt to defaults -- I will move this routes directory.

/*
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
*/
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

module.exports = app;
