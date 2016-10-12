/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

// Module dependencies.

var http = require('http');
var config = require('../config.js');
var route = require('./' + config.route + '_route');
var view = require('./view');
var staticFile = require('./staticFile');

module.exports = init;

/**
 * 初始化应用
 * 
 * @param {Function} app 应用实例
 * @public
 */
 
function init(app) {
	if(config.route === 'RESTful') {
		var rootRoute = route.getRootRoute();

		['use', 'all'].concat(config.methods).forEach(function(key) {
			if(typeof rootRoute[key] === 'function')
				app[key] = rootRoute[key].bind(rootRoute);
		});

		Object.keys(config.staticType).forEach(function(type) {
			app.get('/*\.' + type, staticFile.handle);
		});
	}

	if(config.route === 'MVC') {
		app.use = route.use;
		app.setCtrlPath = route.setCtrlPath;
	}

	app.listen = function(port, callback) {
		return http.createServer(app).listen(port, callback);
	};

	app.setViewPath = view.setPath;
	app.setStaticPath = staticFile.setPath;
	app.handle = route.handle;
};
