/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

// Module dependencies.

var config = require('../config');
var url = require('url');

// Module variable.

var rootRoute = createRoute();	// 根路由

module.exports = exports = createRoute;

/**
 * 创建一个路由对象
 * 
 * @return {Object} 一个新的路由类实例
 * @public
 */

function createRoute() {
	return new Route();
};

/**
 * 路由类
 * 
 * 每一个路由对象都是独立的
 * 将其通过 use 方法按层级依次注册后
 * 就能得到整棵路由树
 * 
 * @public
 */

function Route() {
	this.routes = {all: []};	// 路由对象
	this.subRoutes = [];		// 子路由数组

	config.methods.forEach(function(method) {
		this.routes[method] = [];
	}, this);

	this.prefixURL = '';
	this.globalMid = 0;	// 全局中间件数量(相对于该路由实例下)
}

/**
 * 注册子路由
 * 
 * @param {String} prefixURL 路由匹配前缀
 * @param {Object} route 要注册的路由对象
 * @public
 */

Route.prototype.use = function(prefixURL, route) {
	if(typeof prefixURL !== 'string' || !route instanceof Route)
		throw new TypeError('Parameter type error');

	// 标记路由前缀, 替换用于防止多次根路径注册导致的错误
	route.prefixURL = (this.prefixURL + prefixURL).replace('//', '/');

	this.subRoutes.push(route);
}

/**
 * 注册全局路由(相对于该路由实例下)
 * 
 * 可以直接传入一个或多个中间件
 * 会直接将其作为该路由实例下的全局中间件
 * 
 * @param {String} path 需要匹配的路径
 * @public
 */

Route.prototype.all = function(path) {
	if(typeof path !== 'string') {
		// 注册全局中间件
		this.globalMid += arguments.length;
		Array.prototype.unshift.call(arguments, path);
		path = '/*';
	}

	var route = pathRegexp(path);
	this.routes.all.push({
		path: route.regexp,
		keys: route.keys,
		actions: Array.prototype.slice.call(arguments, 1)
	});
};

// 分别为 config.methods 设置的各个请求方法添加注册路由的方法

config.methods.forEach(function(method) {
	(function(method) {
		Route.prototype[method] = function(path) {
			var route = pathRegexp(path);
			this.routes[method].push({
				path: route.regexp,
				keys: route.keys,
				actions: Array.prototype.slice.call(arguments, 1)
			});
		};
	})(method);
});

/**
 * 路由分发
 * 
 * @param {Object} req
 * @param {Object} res
 * @public
 */

exports.handle = function(req, res) {
	rootRoute.path = url.parse(req.url).pathname;
	
	var globalMidCount = 0;		// 各级路由的全局中间件总数
	var method = req.method.toLowerCase();
	var actions = match(method);

	// 处理逻辑
	if(actions.length === globalMidCount) {
		res.writeHead(404, 'Not Found');
		res.end();
	} else {
		execute(actions);
	}

	/**
	 * 路由匹配
	 * 
	 * @param {String} method 请求方式
	 * @return {Array} 需要执行的中间件数组
	 * @private
	 */

	function match(method) {
		var actions = [];
		var subRoutes = [rootRoute];

		method = ['all', method];

		do {
			subRoutes = onceMatch(subRoutes);
		} while(subRoutes.length)

		return actions;

		/**
		 * 同级路由匹配
		 * 
		 * 匹配当前层级的路由
		 * @param {Array} 当前层级的路由对象数组
		 * @return {Array} 下一层及的路由对象数组
		 * @private
		 */

		function onceMatch(routes) {
			var subRoutes = [];

			routes.forEach(function(routeObj) {
				globalMidCount += routeObj.globalMid;

				// 本级路由匹配
				method.forEach(function(method) {
					routeObj.routes[method].forEach(function(route) {
						var result = route.path.exec(routeObj.path);

						if(result) {
							var params = {};

							for(var i = 0; i < route.keys.length; i++)
								params[route.keys[i]] = result[i + 1];

							req.params = req.params ? Object.assign(req.params, params) : params;
							actions = actions.concat(route.actions);
						}
					});
				});

				// 子级路由匹配
				routeObj.subRoutes.forEach(function(subRouteObj) {
					if(routeObj.path.search(subRouteObj.prefixURL) === 0) {
						// 将匹配剩余的路径传递到子级路由中
						subRouteObj.path = routeObj.path.replace(subRouteObj.prefixURL, '');
						if(subRouteObj.path === '')	subRouteObj.path = '/';

						subRoutes.push(subRouteObj);
					}
				});
			});

			return subRoutes;
		}
	}

	/**
	 * 启动执行中间件数组
	 * 
	 * @param {Array} actions 要执行的中间件数组
	 * @private
	 */

	function execute(actions) {
		(function() {
			if(actions.length)
				(actions.shift())(req, res, arguments.callee);
		})();
	}
};

/**
 * 获取根路由
 * 
 * @return {Object} 根路由实例
 * @public
 */

exports.getRootRoute = function() {
	return rootRoute;
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