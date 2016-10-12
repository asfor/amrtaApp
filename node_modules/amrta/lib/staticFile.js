/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

// Module dependencies.

var fs = require('fs');
var url = require('url');
var path = require('path');
var config = require('../config.js');

// Module variable.

var staticPath = '';	// 静态文件目录

/**
 * 文件请求处理中间件
 * 
 * 该方法是尾部中间件, 没有next
 * 如果不是放在处理流程的最后一个
 * 将会导致之后的所有中间件失效
 * 
 * PS:
 * 该模块采用时间戳的方法来实现
 * 因为ETag需要读取文件计算Hash值
 * 觉得效率还不如时间戳
 * 至于Expires和Cache-Control
 * 我是不太喜欢用, 这个就仁者见仁智者见智了
 * 
 * @param {Object} req
 * @param {Object} res
 * @public
 */

exports.handle = function(req, res) {
	var filename = url.parse(req.url).pathname;
	var type = /\.(\w*?)$/.exec(filename)[1];

	fs.stat(path.join(staticPath, filename), function(err, stat) {
		if(err) {
			// 没有该文件
			res.writeHead(404, 'Not found');
			res.end();
		} else {
			var lastModified = stat.mtime.toUTCString();	// 文件最终修改时间
			if(lastModified === req.headers['if-modified-since']) {
				// 文件无改变, 通知客户端使用本地的缓存文件
				res.writeHead(304, 'Not Modified');
				res.end();
			} else {
				// 文件有改变
				fs.readFile(path.join(staticPath, filename), function(err, file) {
					if(err) {
						// 读取文件出错
						res.writeHead(500, 'Internal Server Error');
						res.end('Error reading file');
					} else {
						// 响应文件, 并更新客户端的最终修改时间设置
						var lastModified = stat.mtime.toUTCString();
						res.setHeader('Last-Modified', lastModified);
						res.setHeader('Content-Type', config.staticType[type]);
						res.writeHead(200, 'It\'s OK');
						res.end(file);
					}
				});
			}
		}
	});
};

/**
 * 设置静态文件目录
 * 
 * @param {String} path
 * @public
 */

exports.setPath = function(path) {
	var tail = path[path.length - 1];
	staticPath = path + (tail === '/' ? '' : '/');
};
