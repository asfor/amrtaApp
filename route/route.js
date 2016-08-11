var amrta = require('amrta');
var route = amrta.route;

route.get('/', middleware, function(req, res, next) {
	res.render('index.html', {title: "Amrta"});
});

function middleware(req, res, next) {
	console.log("Welecome to use amrta");
	next();
}

module.exports = route;
