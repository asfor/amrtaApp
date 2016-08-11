var path = require('path');
var amrta = require('amrta');
var app = amrta();

// 设置模板目录
app.setViewPath(path.join(__dirname, 'views'));

// 设置静态文件目录
app.setStaticPath(path.join(__dirname, 'public'));

// 加载路由
require('./route/route');
require('./route/test');

module.exports = app;