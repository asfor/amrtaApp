var amrta = require('amrta');
var route = amrta.route();

route.get('/', function(req, res, next) {
	res.render('test.html', {
		title: 'test',
		layout: 'layout.html',
		html: '<a href="###">touch me</a>',
		color: '#338899',
		list: [123, 'string', this, {name: 'Syt'}, [456, '789'], function(){}]
	});
});

module.exports = route;
