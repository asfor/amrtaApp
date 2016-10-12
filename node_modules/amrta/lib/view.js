/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

// Module dependencies.

var fs = require('fs');
var path = require('path');

// Module variable.

var viewPath = '';		// 模板文件目录
var res;				// 要处理的res对象引用, 每次请求都会将该次请求的res对象缓存在这
var file = {};			// 模板文件缓存
var metaTpl = {};		// 元模板缓存
const BOUNDARY = '+';	// 布局模板与内容模板之间的分隔符


/**
 * 为res对象挂载render方法
 * 
 * @param {Object} res
 * @public
 */

var view = function(res) {
	res.render = render.bind(res);
};

/**
 * 设置模板文件目录
 * 
 * @param {String} path
 * @public
 */

view.setPath = function(path) {
	var tail = path[path.length - 1];
	viewPath = path + (tail === '/' ? '' : '/');
};

module.exports = view;

/**
 * 模板渲染
 * 
 * @param {String} template 模板文件名称, 以viewPath设置的模板文件目录为根目录的文件路径
 * @param {Object} data 模板参数对象, layout属性为布局模板路径
 * @private
 */

function render(template, data) {
	res = this;
	var layout = data.layout || '';
	var tpl = layout + BOUNDARY + template;

	var noDataTpl = getMetaTpl(tpl);
	var html = noDataTpl(data, escape);

	res.setHeader('Content-Type', 'text/html');
	res.writeHead(200, 'It\'s OK');
	res.end(html);
}

/**
 * 获取元模板
 * 
 * @param {String} template 元模板名称
 * @return {Function} 元模板函数
 * @private
 */

function getMetaTpl(template) {
	if(!metaTpl[template]) {
		var pair = template.split(BOUNDARY);
		var layout = (pair[0] === '')
			? '<% view %>'		// 默认布局模板
			: getFile(pair[0]);
		var subtemplate = getFile(pair[1]);

		var content = layout.replace(/<%\s*view\s*%>/, subtemplate);
		metaTpl[template] = compile(content);
	}

	return metaTpl[template];
}

/**
 * 获取模板文件
 * 
 * @param {String} filename 模板文件名称, 以viewPath设置的模板文件目录为根目录的文件路径
 * @return {String} 模板文件内容
 * @private
 */

function getFile(filename) {
	if(!file[filename]) {
		try {
			file[filename] = fs.readFileSync(path.join(viewPath, filename), 'utf-8');
		} catch(e) {
			res.writeHead(500, 'Internal Server Error');
			res.end('Failed to read template file.');
			return;
		}
	}

	return file[filename];
}

/**
 * 模板编译
 * 
 * @param {String} str 模板字符串
 * @return {Function} 编译完成的元模板函数
 * @private
 */

function compile(str) {
	// 导入子模板
	str = include(str);
	var tpl = str
		.replace(/"/g, '\\\"')	// 将模板中的"和'转义, 以免和元模板中的混淆, 导致编译错误
		.replace(/'/g, '\\\'')
		.replace(/[\r\n]+/g, '\\n')	// 如果没了这个会导致SyntaxError: Unexpected token ILLEGAL
		.replace(/<%=([\s\S]+?)%>/g, function(match, code) {
			// 转义
			return '" + escape(' + code + ') + "';
		})
		.replace(/<%-([\s\S]+?)%>/g, function(match, code) {
			// 非转义
			return '" + ' + code + ' + "';
		})
		.replace(/<%([\s\S]+?)%>/g, function(match, code) {
			// 可执行语句
			return '";\n' + code + '\ntpl += "';
		})
		// 字符串修饰
		.replace(/\"\n/g, '\"')
		.replace(/\n\"/g, '\"');

	tpl = 'tpl = "' + tpl + '";';
	tpl = 'var tpl = "";\nwith($scope || {}) {\n ' + tpl + '\n}\nreturn tpl;';
	return new Function('$scope', 'escape', tpl);
}

/**
 * 导入子模板
 * 
 * @param {String} str 模板字符串
 * @return {String} 已导入子模板的模板字符串
 * @private
 */

function include(str) {
	str = str.replace(/<%\s*(include.*)\s*%>/g, function(match, code) {
		var template = code.split(/\s+/)[1];
		return getFile(template);
	});

	if(str.match(/<%\s*(include.*)\s*%>/))
		return include(str);
	else
		return str;
}

/**
 * 模板内容转义
 * 
 * @param {String} str 模板字符串
 * @return {Function} 转义完成的模板字符串
 * @private
 */

function escape(str) {
	return String(str)
		.replace(/&(?!\w+;)/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');	// IE不支持&apos;
}