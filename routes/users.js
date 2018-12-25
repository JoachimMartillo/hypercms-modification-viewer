var express = require('express');
var router = express.Router();
// multer handles forms posted to the
// server
var multer = require('multer');
var upload = multer();
var mysql = require('mysql');
router.mysql = mysql;

/* GET users listing. */
router.post('/', upload.none(), function(req, res) {
  res.send('respond with a resource');
});

module.exports = router;
