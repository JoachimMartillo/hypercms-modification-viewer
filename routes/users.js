var express = require('express');
var router = express.Router();
const uuidv5 = require('uuid/v5');
// multer handles forms posted to the
// server
var multer = require('multer'); // multer handles forms posted to the
// server
var upload = multer();
router.upload = upload;
var mysql = require('mysql');
router.mysql = mysql;

router.post('/', router.upload.none(), function (req, res) {
    // need to render
    res.send('respond with a resource');
});

// This line is executed on startup -- must be able to transform
// router.upload.none() to a value on startup.
router.post('/', router.upload.none(), function (req, res, next) {
    var cio = req.session.connectInfoSession;
    var ss = new router.webstart.sessShadowBuilder(cio); // This line is only executed
    var con = router.connHashMap.get("con+" + res.req.sessionID);
    // on callback
    // these values below come from the HTTP POST'd form after login is click'd
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
	button_create: req.body.button_create,
	button_edit: req.body.button_edit,
	button_view: req.body.button_view,	
    };

    if(con != null) {
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
    } else if(hcmsuserinfo.button_view == 'view') {
	if(hcmsuserinfo.email == router.webstart.userdefaults.email_ph)
	    res.render('users',
		       Object.assign(Object.assign(Object.assign({}, userdefaults),
						   {title: "HyperCMS Bad User: " + ss.getSessionID(res.req)}),
				     {role_ph: router.connHashMap.get("roles+" + res.req.sessionID)}),
		       function (err, html) {
			   if (err != null) {
			       console.log(err);
			   } else {
			       // html value comes from rendering the Jade template.
			       console.log(html);
			       res.send(html);
			   }
		       });
	else {
	    var query = 'SELECT * FROM Users WHERE email='+hcmsuserinfo.email+';';
	    con.query(query, function (err, result) {});
	}
    } else if(hcmsuserinfo.button_edit == 'edit') {
    } else if(hcmsuserinfo.button_create == 'create') {
    } else {
       res.render('users',
		   Object.assign(Object.assign(Object.assign({}, userdefaults),
					       {title: "Choose Action: " + ss.getSessionID(res.req)}),
				 {role_ph: router.webstart.connHashMap.get("roles+" + res.req.sessionID)}),
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


module.exports = router;
