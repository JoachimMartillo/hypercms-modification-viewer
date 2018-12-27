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

module.exports = router;
