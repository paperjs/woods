// External dependencies
var crypto = require('crypto'),
		passport = require('passport'),
		LocalStrategy = require('passport-local').Strategy;

// Internal dependencies
var fsUtil = require('./util/fs.js'),
		woods = require('./woods');
		settings = require('./settings.json');



passport.use(new LocalStrategy(
	function(username, password, done) {
		var user = getUser(username);
		if (!user) {
			return done(null, false, { message: 'Incorrect username.' });
		}
		if (!validatePassword(username, password)) {
			return done(null, false, { message: 'Incorrect password.' });
		}
		return done(null, user);
	}
));


passport.serializeUser(function(user, done) {
  done(null, user.name);
});

passport.deserializeUser(function(username, done) {
	done(err, getUser(username));
});

var generateSalt = function () {
	return crypto.randomBytes(128).toString('base64');
};

var generateHash = function (plaintext, salt) {
	return crypto.pbkdf2Sync(plaintext, salt, 10000, 512);
};

var getUser = function (user, createIfMissing) {
	// Create users if not existing
	var allUsers = settings.users = settings.users || [];
	if (!(user in allUsers)) {
		if (createIfMissing) {
			return allUsers[user] = {};
		} else {
			return false;
		}
	}
	return allUsers[user];
};

var saveUser = function (username, hash, salt) {
	var user = getUser(username, true);
	user.salt = salt;
	user.hash = hash;
	user.name = username;

	// Do we need to call needless now?
	fs.writeFile('./settings.json', JSON.stringify(settings), function (err) {
		if (err) throw err;
	});
};

var validatePassword = function (username, password) {
	var user = getUser(username);
	if (!user) {
		return false;
	}
	var hash = generateHash(password, user.salt);
	if (hash == user.hash) {
		return true;
	}
};
