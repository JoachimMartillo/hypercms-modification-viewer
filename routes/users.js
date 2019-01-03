var express = require('express');
var router = express.Router();
const uuidv5 = require('uuid/v5');
var datetime = require('node-datetime');
// multer handles forms posted to the
// server
var multer = require('multer'); // multer handles forms posted to the
// server
var upload = multer();
router.upload = upload;
var mysql = require('mysql');
router.mysql = mysql;
var asyncErrDomain = require('domain');

function get_and_store_record_data(button, email, con, req, res) {
    var query = null;
    var user_uuid = null;
    var query2 = null;

    if(button == 'view') {
        query = 'SELECT * FROM Users WHERE email=' + '\'' + email + '\'' + ';';
        con.query(query, function (err, result) {
            if (err) {
                console.log("view query failed!")
                throw err;
            }
            console.log("HyperCMS user data: ");
            for (var idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            router.webStart.connHashTable.put("query+" + req.sessionID, result);
            user_uuid = result[0].uuid;
            query2 = 'SELECT * FROM UserRoles WHERE user_uuid=' + '\'' + user_uuid + '\'' + ';';
            con.query(query2, function (err, result) {
                if (err) {
                    console.log("view query2 failed!")
                    throw err;
                }
                console.log("HyperCMS user-role data: ");
                for (var idb = 0; idb < result.length; ++idb) {
                    console.log(result[idb]);
                }
                /*This is much more complex than it should be.*/
                router.webStart.connHashTable.put("query2+" + req.sessionID, result);
            });
        });
    } else if(button == 'create') {
        query = 'SELECT * FROM Users WHERE email=' + '\'' + email + '\'' + ';';
        con.query(query, function (err, result) {
            if (err) {
                console.log("crete query failed!")
                throw err;
            }
            console.log("HyperCMS user data: ");
            for (var idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            router.webStart.connHashTable.put("query+" + req.sessionID, result);
            user_uuid = result[0].uuid;
            query2 = 'SELECT * FROM UserRoles WHERE user_uuid=' + '\'' + user_uuid + '\'' + ';';
            con.query(query2, function (err, result) {
                if (err) {
                    console.log("create query2 failed!")
                    throw err;
                }
                console.log("HyperCMS user-role data: ");
                for (var idb = 0; idb < result.length; ++idb) {
                    console.log(result[idb]);
                }
                /*This is much more complex than it should be.*/
                router.webStart.connHashTable.put("query2+" + req.sessionID, result);
            });
        });
    } else if(button == 'edit') {
        query = 'SELECT * FROM Users WHERE email=' + '\'' + email + '\'' + ';';
        con.query(query, function (err, result) {
            if (err) {
                console.log("edit query failed!")
                throw err;
            }
            console.log("HyperCMS user data: ");
            for (var idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            router.webStart.connHashTable.put("query+" + req.sessionID, result);
            user_uuid = result[0].uuid;
            query2 = 'SELECT * FROM UserRoles WHERE user_uuid=' + '\'' + user_uuid + '\'' + ';';
            con.query(query2, function (err, result) {
                if (err) {
                    console.log("edit query2 failed!")
                    throw err;
                }
                console.log("HyperCMS user-role data: ");
                for (var idb = 0; idb < result.length; ++idb) {
                    console.log(result[idb]);
                }
                /*This is much more complex than it should be.*/
                router.webStart.connHashTable.put("query2+" + req.sessionID, result);
            });
        });
    }

    res.render('viewpause', {title: 'User not yet ready: ' + req.sessionID}, function (err, html) {
        if (err != null) {
            console.log(err);
        } else {
            console.log(html); // the MySQL Login form
            res.send(html);
        }
    });
}

// This line is executed on startup -- must be able to transform
// router.upload.none() to a value on startup.
router.post('/', router.upload.none(), function (req, res, next) {
    var cio = req.session.connectInfoSession;
    var ss = new router.webStart.sessShadowBuilder(cio); // This line is only executed
    var con = router.webStart.connHashTable.get("con+" + res.req.sessionID);
    // on callback
    // these values below come from the HTTP POST'd form after login is click'd
    var button = ((req.body.button_create == "create") ? "create" : "");
    var button = button + ((req.body.button_edit == "edit") ? "edit" : "");
    var button = button + ((req.body.button_view == "view") ? "view" : "");
    var hcmsuserinfo = {
        email: req.body.email,
        hcmspassword: req.body.hcmspassword,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        lastname: req.body.lastname,
        firstname: req.body.firstname,
        middlename: req.body.middlename,
        phone: req.body.phone,
        jobTitle: req.body.jobTitle,
        role: req.body.role,
        button: button
    };

    var processDataBase = asyncErrDomain.create();

    processDataBase.on('error', function (err) {
        console.log("Could not get to Users datatable.")
        console.log("Is the correct MySQL server selected?")
        ss.setConnectInfoTryable(false);

        res.render('index', {title: 'MySQL Reconnect Page: ' + ss.sessionID}, function (err, html) {
            if (err != null) {
                console.log(err);
            } else {
                console.log(html); // the MySQL Login form
                res.send(html);
            }
        });
    });

    processDataBase.run(function () {
        /* Absence of connection to database server is insurmountable obstacle */
        if (con == undefined)
            con = null;
        if (con == null) {
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
        } else if(hcmsuserinfo.email == router.webStart.userdefaults.email_ph) {
            /* Tommy Flowers doesn't exist in database. */
            /* I really dislike this indentation */
            res.render('users',
                Object.assign(Object.assign(Object.assign({}, router.webStart.userdefaults),
                    {title: "HyperCMS Bad User: " + req.sessionID}),
                    {role_ph: router.connHashTable.get("roles+" + req.sessionID)}),
                function (err, html) {
                    if (err != null) {
                        console.log(err);
                    } else {
                        // html value comes from rendering the Jade template.
                        console.log(html);
                        res.send(html);
                    }
                });
        } else if (hcmsuserinfo.button != "") {
            router.webStart.connHashTable.put("newuserdata+" + req.sessionID, hcmsuserinfo);
            get_and_store_record_data(button, hcmsuserinfo.email, con, req, res);
        } else {
            /* This code may be unnecessary because some button should be pushed. */
            res.render('users',
                Object.assign(Object.assign(Object.assign({}, router.webStart.userdefaults),
                    {title: "Choose Action: " + ss.getSessionID(res.req)}),
                    {role_ph: router.webstart.connHashTable.get("roles+" + req.sessionID)}),
                function (err, html) {
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
});

router.post('/viewpause', router.upload.none(), function (req, res, next) {
    var cio = req.session.connectInfoSession;
    var ss = new router.webStart.sessShadowBuilder(cio);
    var queryresult = router.webStart.connHashTable.get("query+" + req.sessionID);
    var queryresult2 = router.webStart.connHashTable.get("query2+" + req.sessionID);
    var rolestable = router.webStart.connHashTable.get("rolesTable+" + req.sessionID);
    var hcmsuserinfo = router.webStart.connHashTable.get("newuserdata+" + req.sessionID);

    if ((rolestable == undefined) || (rolestable == null)) {
        console.log("Roles Table seems to be missing.");
        res.render('restart', {
            title: "New Session after Error",
            url: '/'
        }, function (err, html) {
            if (err != null) {
                console.log(err);
            } else {
                // html value comes from rendering the Jade template.
                console.log(html);
                res.send(html);
            }
        }); /* If queryresult2  */
    } else if ((queryresult2 == undefined) || (queryresult2 == null)) {
        res.render('viewpause', {title: 'User not yet ready: ' + ss.getSessionID(res.req)},
            function (err, html) {
                if (err != null) {
                    console.log(err);
                } else {
                    console.log(html); // the MySQL Login form
                    res.send(html);
                }
            });
    } else {
        /* let's get the role */
        var role_uuid = queryresult2[0].role_uuid;
        var role = 'unknown';
        for (i = 0; i < rolestable.length; ++i) {
            if (rolestable[i].uuid == role_uuid) {
                role = rolestable[i].code;
            }
        }

        if(queryresult[0].last_name == null)
            queryresult[0].last_name = "";
        if(queryresult[0].first_name == null)
            queryresult[0].first_name = "";
        if(queryresult[0].middle_name == null)
            queryresult[0].middle_name = "";
        if(queryresult[0].phone == null)
            queryresult[0].phone = "";
        if(queryresult[0].job_title == null)
            queryresult[0].job_title = "";

        var initialization = {
            email: "email: " + queryresult[0].email,
            lastname: "lastname: " + queryresult[0].last_name,
            firstname: "firstname: " + queryresult[0].first_name,
            middlename: "middlename: " + queryresult[0].middle_name,
            phone: "phone: " + queryresult[0].phone,
            job: "job: " + queryresult[0].job_title,
            role: "role: " + role
        }

        res.render('userdisplay',
            Object.assign(Object.assign({}, initialization),
                {title: "Database Result: " + ss.getSessionID(res.req)}),
            function (err, html) {
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

router.get('/nextaction', function (req, res, next) {
    var cio = req.session.connectInfoSession;
    var ss = new router.webStart.sessShadowBuilder(cio); // This line is only executed

    if(req.query.button_cancel == 'cancel_session') {
        var con = router.webStart.connHashTable.get("con+" + res.req.sessionID);
        if (con == undefined)
            con = null;
        router.webStart.cancel_current_session(con, req, res);
    } else {
        router.webStart.start_new_user(ss, req, res);
    }
});

module.exports = router;
