/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */


/**
 * session模块
 * 
 * 该模块不可以使用在生产环境中
 * 由于该模块将session直接存储在内存中
 * 当并发量过大时会导致内存耗空
 * 进而引发后续的大量问题
 * 
 * 可以修改模块，使用文件缓存或者第三方缓存
 */

// Module dependencies.

var config = require('../config');
var cookie = require('./cookie');

// Module variable.

var sessions = {};							// session缓存对象
var expires = config.sessionExpires * 60;	// session过期时间
const key = 'session';						// session id存在cookie中的键名

/**
 * 创建session
 * 
 * @return {Object} 新创建的session实例
 * @public
 */

exports.create = function() {
	var session = {};

	session.id = new Date().getTime() + Math.random();
	session.cookie = {
		expire: new Date(new Date().getTime() + expires * 1000)
	};

	sessions[session.id] = session;
	return session;
};

/**
 * 获取session
 * 
 * @param {String} id
 * @return {Object}
 * @public
 */

exports.get = function(id) {
	return sessions[id];
};

/**
 * 删除session
 * 
 * @param {String} id
 * @public
 */

exports.delete = function(id) {
	delete sessions[id];
};

/**
 * session解析中间件
 * 
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @public
 */

exports.parse = function(req, res, next) {
	// 获取存储在cookie中的session id
	var id = req.cookies[key];

	if(id) {
		// cookie中有session id
		var session = exports.get(id);
		if(session) {
			if(session.cookie.expire > (new Date()).getTime()) {
				// session正确, 更新过期时间
				session.cookie.expire = new Date(new Date().getTime() + expires * 1000);
				req.session = session;
			} else {
				// session过期
				exports.delete(id);
				req.session = exports.create();
			}
		} else {
			// session不存在
			req.session = exports.create();
		}
	} else {
		// 没有session id
		req.session = exports.create();
	}

	// 将session id存放到cookie中
	cookie.set(res, cookie.create(key, req.session.id, req.session.cookie));
	next();
};