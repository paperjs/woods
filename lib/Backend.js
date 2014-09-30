// External dependencies
var crypto = require('crypto'),
		passport = require('passport'),
		LocalStrategy = require('passport-local').Strategy,
		jade = require('jade');

// Internal dependencies
var fsUtil = require('./util/fs.js'),
		woods = require('./woods');
		auth = require('./auth');
		settings = require('./settings.json');


function installBackEndRoutes() {
	site.woods.express.get('/login', function (req, res, next) {

	});

	site.woods.express.get('/admin', function (req, res, next) {

	});

	site.woods.express.post('/login', function (req, res, next) {
		 passport.authenticate('local', { successRedirect: '/admin',
																			failureRedirect: '/login',
																			failureFlash: true });
	});
}
