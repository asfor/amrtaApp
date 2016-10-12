/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

// Module dependencies.

var url = require('url');

// Module variable.

var routes = [];	// 路由对象

/**
 * 静态路由分发
 * 
 * @param {Object} req
 * @param {Object} res
 * @return {Boolean} 是否匹配成功
 * @public
 */

exports.handle = function(req, res) {
	var path = url.parse(req.url).pathname;

	for(var route of routes) {
		var result = route.path.exec(path);
		if(result) {
			var params = {};

			for(var i = 0; i < route.keys.length; i++)
				params[route.keys[i]] = result[i + 1];

			req.params = params;
			route.action(req, res);
			return true;
		}
	}

	return false;
};

/**
 * 静态路由注册
 * 
 * @param {String} path	注册路径
 * @param {Function} action 对应的方法
 * @public
 */

exports.use = function(path, action) {
	var route = pathRegexp(path);
	routes.push({
		path: route.regexp,
		keys: route.keys,
		action: action
	});
};

/**
 * 注册路由解析
 * 
 * @param {String} path 需要匹配的路径
 * @return {Object} 一个路由对象, regexp属性为路径匹配的正则表达式, keys属性为该路径所挂载的参数键名数组
 * @private
 */

function pathRegexp(path) {
	var keys = [];

	path = path
		.replace(/\/\(/g, '(?:/')
		.replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star) {
			keys.push(key);
			slash = slash || '';
			return ''
				+ (optional ? '' : slash)
				+ '(?:'
				+ (optional ? slash : '')
				+ (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
				+ (optional || '')
				+ (star ? '(/*)?' : '');
		})
		.replace(/([\/.])/g, '\\$1')
		.replace(/\*/g, '(.*)');

	return {
		keys: keys,
		regexp: new RegExp('^' + path + '$')
	};
}