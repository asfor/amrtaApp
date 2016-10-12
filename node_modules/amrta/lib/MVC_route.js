/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

// Module dependencies.

var config = require('../config.js');
var Static = require('./Static_route');

// Module variable.

var ctrlPath = '';	// 控制器文件目录

exports.use = Static.use;

/**
 * 设置控制器文件目录
 * 
 * @param {String} path 
 * @public
 */
exports.setCtrlPath = function(path) {
	ctrlPath = path;
};

/**
 * 路由分发
 * 
 * @param {Object} req
 * @param {Object} res
 * @public
 */

exports.handle = function(req, res) {
	var path = url.parse(req.url).pathname;

	// 静态路由优先
	if(Static.handle(req, res))	return;

	// MVC自然映射
	var parts = path.split('/');
	var controller = parts[1] || config.defaultController;
	var action = parts[2] || config.defaultAction;
	var args = [req, res].concat(parts.slice(3));
	var C;	// 控制器实例

	try {
		C = require(ctrlPath + controller);
	} catch(e) {
		// 找不到控制器
		res.writeHead(404, 'Not Found');
		res.end('Can not find the corresponding controller');
	}

	if(C[action]) {
		C[action].apply(null, args);
	} else {
		// 找不到相应的方法
		res.writeHead(404, 'Not Found');
		res.end('Can not find the corresponding action');
	}
};