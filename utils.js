//Define the include function for absolute file name
global.base_dir = __dirname;
global.abs_path = function(path) {
	return base_dir + path;
}
global.include = function(file) {
	return require(abs_path('/' + file));
}

module.exports = {
	isAuthenticated: (req, res, next) => {
	  if (!req.session.authenticated) return res.redirect("/login");
	  next();
	},
	isAdmin: (req, res, next) => {
	  if (req.session.user_type !== "admin") {
		return res.status(403).send("Forbidden - Admins only");
	  }
	  next();
	},
  };
  