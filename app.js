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

module.exports = app;