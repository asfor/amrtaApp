/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

'use strict';

var config = require('../config.js');
var init = require('./init');
var view = require('./view');

/**
 * Expose 'createApplication()'.
 */

exports = module.exports = createApplication;

/**
 * 创建一个Amrta应用
 * 
 * @return {Function}
 * @api public
 */

function createApplication() {
	var app = function(req, res) {
		view(res);
		app.handle(req, res);
	};

	init(app);
	return app;
}

// 附加功能挂载
exports.body = require('./body');
exports.route = require('./' + config.route + '_route');
exports.cookie = require('./cookie');
exports.session = require('./session');
exports.webSocket = require('./webSocket');
exports.staticFile = require('./staticFile');