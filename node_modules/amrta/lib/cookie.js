/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

/**
 * 创建cookie
 * 
 * @param {String} name cookie的键名
 * @param {String} value cookie的键值
 * @param {Object} [option] cookie选项对象
 * @return {String} 返回的字符串为响应头中Set-Cookie字段的值
 * @public
 */

exports.create = function(name, value, option) {
	var pairs = [name + "=" + value];
	option = option || {};

	if(option.expires)	pairs.push('Expires='	+ option.expires.toUTCString());
	if(option.maxAge)	pairs.push('Max-Age='	+ option.maxAge);
	if(option.path)		pairs.push('Path='		+ option.path);
	if(option.domain)	pairs.push('Domain='	+ option.domain);
	if(option.httpOnly)	pairs.push('HttpOnly');
	if(option.secure)	pairs.push('Secure');

	return pairs.join('; ');
};

/**
 * cookie解析中间件
 * 
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @public
 */

exports.parse = function(req, res, next) {
	var cookieString = req.headers.cookie;
	var cookies = {};

	if(cookieString) {
		var list = cookieString.split(';');
		for(var cookie of list) {
			var pair = cookie.split('=');
			cookies[pair[0].trim()] = pair[1];
		}
	}

	// 将解析完成的cookie作为一个对象挂载在req对象上
	req.cookies = cookies;
	next();
};

/**
 * 在响应头中设置cookie
 * 
 * @param {Object} res
 * @param {String} cookie 响应头中Set-Cookie字段的值
 * @public
 */

exports.set = function(res, cookie) {
	res.setHeader('Set-Cookie', cookie);
};
