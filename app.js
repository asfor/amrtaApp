var path = require('path');
var amrta = require('amrta');
var app = amrta();

// 设置模板目录
app.setViewPath(path.join(__dirname, 'views'));

// 设置静态文件目录
app.setStaticPath(path.join(__dirname, 'public'));

// 加载路由
var index = require('./route/route');
var test = require('./route/test');

app.use('/', index);
app.use('/test', test);

// 错误流程注册
app.error(404, (req, res) => {
	res.setHeader('Content-Type', 'text/html');
	res.writeHead(404, 'Not Found');
	res.render('error.html', {status: 404, info: 'Not Found'});
});

module.exports = app;