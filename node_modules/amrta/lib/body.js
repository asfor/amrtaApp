/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

// Module dependencies.

var config = require('../config');
var querystring = require('querystring');

// Module variable.

const MAX_BYTES = config.max_MB * 1024 * 1024;	// 上传文件限制大小

/**
 * 请求体解析
 * 
 * 仅支持以下三种请求类型：
 *  1.application/x-www-form-urlencoded
 *  2.application/json
 *  3.multipart/form-data
 * 
 * 且multipart/form-data仅能用于提交文本文件
 * 由于body处理是在将buffer转为string之后, 所以二进制文件会损坏
 * 
 * @parama {Object} req
 * @parama {Object} res
 * @private
 */

var bodyParse = function(req, res) {
	var bodyType = req.headers['content-type'];
	var pair;

	if(bodyType === 'application/x-www-form-urlencoded') {
		// 表单提交
		req.body = querystring.parse(req.rawBody);
	} else if(bodyType === 'application/json') {
		// json提交
		req.body = JSON.parse(req.rawBody);
	} else if((pair = bodyType.split(';'))[0].trim() === 'multipart/form-data') {
		// 文件提交
		req.boundary = pair[1].replace('boundary=', '');
		req.filename = /filename\=\".*\"/
						.exec(req.rawBody)[0]
						.replace(/\"/g, '')
						.replace('filename=', '');
		req.body = req.rawBody
					.split(new RegExp('[\r\n]*?--' + req.boundary + '[\r\n]*?'))
					.slice(-2)[0]
					.replace(/Content-.*[\r\n]*Content-.*[\r\n]*/, '')
					.replace(/.*[\r\n]*/, '');
	} else {
		// 不支持的提交方式
		res.writeHead(400, 'Bad Request');
		res.end('Submit the data type "' + req.headers['content-type'] + '" is not supported!');
	}
};

/**
 * 请求体解析中间件
 * 
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @public
 */

exports.handle = function(req, res, next) {
	var buffers = [];
	var hasBody = 'transfer-encoding' in req.headers || 'content-length' in req.headers;
	var len = req.headers['content-length'] - 0 || null;
	var accepted = 0;	// 已接受的文件大小

	if(hasBody) {
		if(len > MAX_BYTES) {
			// 文件大小
			res.writeHead(413, "Request Entity Too Large");
			res.end('file length more than ' + MAX_BYTES/1024 + ' MB');
		}

		req.on('data', function(data) {
			accepted += data.length;
			if(accepted > MAX_BYTES) {
				// 已接受的内容超过了限制的大小
				req.destroy();
				res.writeHead(413, "Request Entity Too Large");
				res.end('file length more than ' + MAX_BYTES/1024 + ' MB');
			}

			buffers.push(data);
		});
		req.on('end', function() {
			req.rawBody = Buffer.concat(buffers).toString();
			bodyParse(req, res);
			next();
		});
	} else {
		next();
	}
};
