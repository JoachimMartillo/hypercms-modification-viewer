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

function view_pause(req, res) {
    res.render('viewpause', {title: 'User not yet ready: ' + req.sessionID}, function (err, html) {
        if (err != null) {
            console.log(err);
        } else {
            console.log(html); // the MySQL Login form
            res.send(html);
        }
    });
}

function get_and_store_record_data(button, email, con, req, res) {
    var hcmsuserinfo = router.webStart.connHashTable.get("newuserdata+" + req.sessionID);
    var rolestable = router.webStart.connHashTable.get("rolesTable+" + req.sessionID);
    var query = null;
    var user_uuid = null;
    var query2 = null;
    // These two variables should work for both edit & create.
    var sql_insert = null;
    var sql_insert2 = null;

    if (button == 'view') {
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
                /* what if length is 0 -- non-existent user */
                /*This is much more complex than it should be.*/
                router.webStart.connHashTable.put("query2+" + req.sessionID, result);
            });
        });
        // This routine must be executed to respond to the original post request that identified
        // the button pressed (view, edit, or create).
        view_pause(req, res);
    } else if (button == 'create') {
        query = 'SELECT * FROM Users WHERE email=' + '\'' + email + '\'' + ';';
        con.query(query, function (err, result) {
            if (err) {
                console.log("create query failed!")
                throw err;
            }
            console.log("HyperCMS user data: ");
            for (var idb = 0; idb < result.length; ++idb) {
                console.log(result[idb]);
            }
            router.webStart.connHashTable.put("query+" + req.sessionID, result);
            if (result.length != 0) {/* If creation, there should be no records */
                //    just view the record
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
                    hcmsuserinfo.button = 'view';
                });
            } else {
                // here us the create prologue
                const create_time = datetime.create().format('Y/m/d H:M:S');
                const user_uuid_value = uuidv5('philips.hyper-cms.com', uuidv5.DNS);
                const userroles_uuid_value = uuidv5('philips.hyper-cms.com', uuidv5.DNS);

                var row = {
                    uuid: user_uuid_value,
                    created_at: create_time,
                    modified_at: create_time,
                    email: email,
                    password: hcmsuserinfo.password,
                    last_name: hcmsuserinfo.lastname,
                    first_name: hcmsuserinfo.firstname,
                    middle_name: hcmsuserinfo.middlename,
                    phone: hcmsuserinfo.phone,
                    job_title: hcmsuserinfo.jobTitle,
                    SSR: 'North America',
                    registered_on: create_time,
                    default_library_uuid: "2a0046e8-4884-11e2-a2bc-001ec9b84463"/* I don't know why this is set*/
                };

                var userroles_row = {
                    uuid: userroles_uuid_value,
                    role_uuid: "", /* need to fill in this value */
                    user_uuid: user_uuid_value
                };
                sql_insert = 'INSERT INTO Users (uuid, created_at, modified_at, email, password, last_name, ' +
                    'first_name, middle_name, phone, job_title, SSR, registered_on, default_library_uuid) VALUES ' +
                    '(\"' + row.uuid + '\", \"' + row.created_at + '\", \"' + row.modified_at + '\", \"' + row.email + '\", \"' +
                    row.password + '\", \"' + row.last_name + '\", \"' + row.first_name + '\", \"' + row.middle_name +
                    '\", \"' + row.phone + '\", \"' + row.job_title + '\", \"' + row.SSR + '\", \"' +
                    row.registered_on + '\", \"' + row.default_library_uuid + '\");';
                con.query(sql_insert, function (err, result) {
                    if (err) {
                        console.log("create sql_insert failed!")
                        throw err;
                    }
                    console.log("Insert result: ");
                    console.log(result);
                    //    let's insert into UserRoles table
                    if(hcmsuserinfo.role == "") {
                        hcmsuserinfo.role = "editor";
                    }
                    hcmsuserinfo.role = hcmsuserinfo.role.toLowerCase();
                    //row 0 is editor
                    userroles_row.role_uuid = rolestable[0].uuid;
                    for (var i = 0; i < rolestable.length; ++i) {
                        if (rolestable[i].code == hcmsuserinfo.role) {
                            userroles_row.role_uuid = rolestable[i].uuid;
                            break;
                        }
                    }
                    sqlinsert2 = 'INSERT INTO UserRoles (uuid, role_uuid, user_uuid) VALUES ' +
                        '(\"' + userroles_row.uuid + '\", \"' + userroles_row.role_uuid + '\", \"' + userroles_row.user_uuid + '\");';
                    con.query(sql_insert2, function (err, result) {
                        if (err) {
                            console.log("create sql_insert2 failed!")
                            throw err;
                        }
                        console.log("Insert2 result: ");
                        console.log(result);
                        // The structure below is contained in the hashtable, or it should be.
                        // now we can view
                        hcmsuserinfo.button = 'view';
                        // This may be logically contorted because we waited for some of database work
                        get_and_store_record_data(hcmsuserinfo.button, email, con, req, res);
                    });
                });
            }
        });
    } else if (button == 'edit') {
        // here is the edit prologue
        const create_time = datetime.create().format('Y/m/d H:M:S');
        const user_uuid_value = uuidv5('philips.hyper-cms.com', uuidv5.DNS);
        const userroles_uuid_value = uuidv5('philips.hyper-cms.com', uuidv5.DNS);

        var row = {
            uuid: user_uuid_value,
            created_at: create_time,
            modified_at: create_time,
            email: email,
            password: hcmsuserinfo.password,
            last_name: hcmsuserinfo.lastname,
            first_name: hcmsuserinfo.firstname,
            middle_name: hcmsuserinfo.middlename,
            phone: hcmsuserinfo.phone,
            job_title: hcmsuserinfo.jobTitle,
            SSR: 'North American',
            registered_on: create_time,
            default_library_uuid: "2a0046e8-4884-11e2-a2bc-001ec9b84463"/* I don't know why this is set*/
        };

        var userroles_row = {
            uuid: userroles_uuid_value,
            role_uuid: "", /* need to fill in this value */
            user_uuid: user_uuid_value
        };
        sql_insert = 'INSERT INTO Users (uuid, created_at, modified_at, email, password, last_name, ' +
            'first_name, middle_name, phone, job_title, SSR, registered_on, default_library_uuid) VALUES ' +
            '(\"' + row.uuid + '\", \"' + row.created_at + '\", \"' + row.modified_at + '\", \"' + row.email + '\", \"' +
            row.password + '\", \"' + row.last_name + '\" , \"' + row.first_name + '\", \"' + row.middle_name +
            '\", \"' + row.phone + '\", \"' + row.job_title + '\", \"' + row.SSR + '\", \"' +
            row.registered_on + '\", "' + row.default_library_uuid + '\");';
        con.query(sql_insert, function (err, result) {
            if (err) {
                console.log("create sql_insert failed!")
                throw err;
            }
            console.log("Insert result: ");
            console.log(result);
            //    let's insert into UserRoles table
            hcmsuserinfo.role = hcmsuserinfo.role.toLowerCase();
            //row 0 is editor
            userroles_row.role_uuid = rolestable[0].uuid;
            for (var i = 0; i < rolestable.length; ++i) {
                if (rolestable[i].code == hcmsuserinfo.role) {
                    userroles_row.role_uuid = rolestable[i].uuid;
                    break;
                }
            }
            sqlinsert2 = 'INSERT INTO UserRoles (uuid, role_uuid, user_uuid) VALUES ' + '(\"' + userroles_row.uuid + '\", \"' + userroles_row.role_uuid + '\", \"' + userroles_row.user_uuid + '\");';
            con.query(sql_insert2, function (err, result) {
                if (err) {
                    console.log("create sql_insert2 failed!")
                    throw err;
                }
                console.log("Insert2 result: ");
                console.log(result);
                // The structure below is contained in the hashtable, or it should be.
                // now we can view
                hcmsuserinfo.button = 'view';
                // this may be logically contorted because we waited for some of database work
                get_and_store_record_data(hcmsuserinfo.button, email, con, req, res);
            });
        });
    }
}

// This line is executed on startup -- must be able to transform
// router.upload.none() to a value on startup.
router.post('/', router.upload.none(), function (req, res, next) {
    var cio = req.session.connectInfoSession;
    var ss = new router.webStart.sessShadowBuilder(cio); // This line is only executed
    var con = router.webStart.connHashTable.get("con+" + req.sessionID);
    // on callback
    // these values below come from the HTTP POST'd form after login is click'd
    var button = ((req.body.button_create == "create") ? "create" : "");
    var button = button + ((req.body.button_edit == "edit") ? "edit" : "");
    var button = button + ((req.body.button_view == "view") ? "view" : "");
    button = ((button == "") ? "view" : button);
    var hcmsuserinfo = {
        email: ((req.body.email == undefined) ? "" : req.body.email),
        hcmspassword: ((req.body.hcmspassword == undefined) ? "" : req.body.hcmspassword),
        password: ((req.body.password == undefined) ? "" : req.body.password),
        confirmPassword: ((req.body.confirmPassword == undefined) ? "" : req.body.confirmPassword),
        lastname: ((req.body.lastname == undefined) ? "" : req.body.lastname),
        firstname: ((req.body.firstname == undefined) ? "" : req.body.firstname),
        middlename: ((req.body.middlename == undefined) ? "" : req.body.middlename),
        phone: ((req.body.phone == undefined) ? "" : req.body.phone),
        jobTitle: ((req.body.jobTitle == undefined) ? "" : req.body.jobTitle),
        role: ((req.body.role == undefined) ? "" : req.body.role),
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
        } else if (hcmsuserinfo.email == "") {
	    // The defaults correspond to null strings -- I have to add logic
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
        } else {
            router.webStart.connHashTable.put("newuserdata+" + req.sessionID, hcmsuserinfo);
            get_and_store_record_data(button, hcmsuserinfo.email, con, req, res);
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
        // Need to process button associated with incoming post request
        //    This button for view, create, edit
    } else if ((hcmsuserinfo.button != 'view') || (queryresult2 == undefined) || (queryresult2 == null)) {
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
        if(queryresult.length == 0) {
            // this function responds to the origin request. 
            router.webStart.start_new_user(ss, req, res);
        } else {
            /* let's get the role */
            var role_uuid = queryresult2[0].role_uuid;
            var role = 'unknown';
            for (i = 0; i < rolestable.length; ++i) {
                if (rolestable[i].uuid == role_uuid) {
                    role = rolestable[i].code;
                }
            }

            if (queryresult[0].last_name == null)
                queryresult[0].last_name = "";
            if (queryresult[0].first_name == null)
                queryresult[0].first_name = "";
            if (queryresult[0].middle_name == null)
                queryresult[0].middle_name = "";
            if (queryresult[0].phone == null)
                queryresult[0].phone = "";
            if (queryresult[0].job_title == null)
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
                    {title: "Database Result: " + req.sessionID}),
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
    }
});

router.get('/nextaction', function (req, res, next) {
    var cio = req.session.connectInfoSession;
    var ss = new router.webStart.sessShadowBuilder(cio); // This line is only executed

    if (req.query.button_cancel == 'cancel_session') {
        var con = router.webStart.connHashTable.get("con+" + req.sessionID);
        if (con == undefined)
            con = null;
        router.webStart.cancel_current_session(con, req, res);
    } else {
        router.webStart.start_new_user(ss, req, res);
    }
});

module.exports = router;
