/*!
 * amrta
 * Copyright (c) 2016 Shi Yutao. All rights reserved.
 * MIT Licensed
 */

// Module dependencies.

var http	= require('http');
var url		= require('url');
var crypto	= require('crypto');

// Module exports.

var WebSocket = function(path) {
	this.options = url.parse(path === undefined ? '' : path);
	this.isClient = false;
};

/**
 * 双方密钥验证使用的hash, 在WebSocket协议中是固定值
 * @private
 */

WebSocket.hash = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/**
 * 下面四个事件是模拟浏览器端的, 可以根据需求在new后自行修改
 * 需要注意的是, 在调用connect()发出连接, socket被注册后, 要再修改就只有重新connect()后才会生效
 */

/**
 * 作为客户端时, 连接建立成功时触发
 * 
 * @public
 */

WebSocket.prototype.onopen = function() {
	console.log('WebSocket is created!');
};

/**
 * 接收到消息时触发, frame为解析完成的数据帧
 *
 * @param {Object} frame 解析完成的数据帧报文
 * @public
 */

WebSocket.prototype.onmessage = function(frame) {
	console.log(frame.data.toString());
};

/**
 * 断开连接时触发
 * 
 * @public
 */

WebSocket.prototype.onclose = function() {};

/**
 * 抛出异常时触发
 * 
 * @public
 */

WebSocket.prototype.onerror = function() {};

/**
 * 注册socket套接字
 * 
 * @param {Object} socket socket对象, 是Stream对象的实例
 * @public
 */

WebSocket.prototype.setSocket = function(socket) {
	var that = this;
	this.socket = socket;

	this.socket.on('data', function(data) {
		// 不能直接操作, 要对数据帧进行处理
		var frame = WebSocket.decode(data);

		// 服务器端接受到不加密的数据帧要断开连接, 客户端接收到加密的数据帧也断开连接
		if(!(that.isClient ^ frame.masked))	that.close();

		that.onmessage(frame);
	});

	this.socket.on('end', function() {
		that.onclose();
		that.close();
	});

	this.socket.on('error', this.onerror);

	// 还可以扩展注册其他的socket事件
};

/**
 * 充当客户端发起链接请求
 * 
 * @public
 */

WebSocket.prototype.connect = function() {
	var that = this;
	var key = new Buffer(this.options.protocolVersion + '-' + Date.now()).toString('base64');
	var expected = crypto.createHash('sha1').update(key + WebSocket.hash).digest('base64');
	this.isClient = true;

	var options = {
		port: that.options.port,
		host: that.options.hostname,
		headers:{
			'Connection': 'Upgrade',
			'Upgrade': 'websocket',
			'Sec-WebSocket-Version': 13,
			'Sec-WebSocket-Key': key
		}
	};

	var req = http.request(options);
	req.end();

	req.on('upgrade', function(res, socket, upgradeHead) {

		// 验证密钥
		if(res.headers['sec-websocket-accept'] !== expected) {
			socket.end();
			throw new Error('validation key is bad');
		}

		that.setSocket(socket);
		that.onopen();
	});
};

/**
 * 发送数据
 * 
 * @param {String} data 要发送的字符串数据
 * @public
 */

WebSocket.prototype.send = function(data) {
	this.socket.write(WebSocket.encode(data, this.isClient));
};

/**
 * 关闭连接
 * 
 * @public
 */

WebSocket.prototype.close = function() {
	this.socket.end();
}

/**
 * 封装数据帧
 * 
 * @param {String} data 要处理的目标字符串数据
 * @param {Boolean} isClient 是否为客户端WebSocket实例
 * @return {Buffer}
 * @private
 */

WebSocket.encode = function(data, isClient) {
	if(Object.prototype.toString.call(data) !== '[object String]')	throw new Error('data must be String type');
	var dataBuf = new Buffer(data);	//目标数据Buffer
	var temp	= [];				//临时变量

	/**
	 * 零比特填充, 从左侧开始填充，直到整体达到指定长度
	 * 
	 * @param {String} bitStr 要填充的比特字符串
	 * @param {Number} len 整体要达到的长度
	 * @return {String} 返回值为比特字符串
	 */

	var zeroFill = function(bitStr, len) {
		if((bitStr.length - len) === 0)	return bitStr;
		return arguments.callee('0'+bitStr, len);
	};

	var fin		= 1;				//结尾帧标记
	var rsv1	= 0;				//无扩展协议1
	var rsv2	= 0;				//无扩展协议2
	var rsv3	= 0;				//无扩展协议3
	var opcode	= '0001';			//文本数据帧
	var masked	= isClient ? 1 : 0;	//是否掩码加密
	var length	= dataBuf.length;	//目标数据长度, 单位byte

	if(masked) {
		var maskingKey = [];		//加密密钥

		//随机生成掩码密钥
		for(var i = 0; i < 32; i++) {
			temp.push(Math.floor(Math.random() * 2));
			if(i % 8 === 7) {
				maskingKey.push(parseInt(temp.join(''), 2));
				temp = [];
			}
		}

		//对目标数据进行掩码加密
		for(var i = 0; i < dataBuf.length; i++)
			dataBuf[i] ^= maskingKey[i % 4];
	}

	// 头部信息部分比特串
	var bitStr 	= (fin	+ '')
				+ (rsv1	+ '')
				+ (rsv2	+ '')
				+ (rsv3	+ '')
				+ opcode
				+ (masked + '')
				+ (length > 125 ? (length > 65535 ? '1111111' : '1111110') : '')
				+ (length > 125 ? (length > 65535 ? zeroFill(length.toString(2), 64) : zeroFill(length.toString(2), 16)) : zeroFill(length.toString(2), 7));

	var frameHead = [];
	for(var i = 0; i < bitStr.length; i++) {
		temp.push(bitStr[i]);
		if(i % 8 === 7) {
			frameHead.push(parseInt(temp.join(''), 2));
			temp = [];
		}
	}

	var frameLen = frameHead.length + (masked ? maskingKey.length : 0) + dataBuf.length;
	var frame = (new Buffer(frameLen)).fill(0);

	var i = 0;

	// 这里只是为了排版好看点……
				for(var byte of frameHead)	frame[i++] = byte;
	if(masked)	for(var byte of maskingKey)	frame[i++] = byte;
				for(var byte of dataBuf)	frame[i++] = byte;

	return frame;
};

/**
 * 解析数据帧
 * 
 * @param {Buffer} buffer 要处理的目标字符串数据
 * @return {Object}
 * @private
 */

WebSocket.decode = function(buffer) {
	var temp;			//临时变量
	var frame = {};		//解析结果对象
	var mark = 0;		//byte标记

	/**
	 * 获取下一个字节
	 * 
	 * @param {Number} [len] 要获取的字节个数, 默认为1
	 * @return {String} 返回值为比特字符串
	 */

	var getNextByte = function(i) {
		if(i === undefined)	i = 1;
		if(i === 0)	return '';
		var bitStr = parseInt(buffer[mark++]).toString(2);
		while(bitStr.length < 8)
			bitStr = '0' + bitStr;

		return bitStr + getNextByte(--i);
	};

	temp = getNextByte();
	frame.fin	= temp[0];	//是否为结尾帧
	frame.rsv1	= temp[1];	//扩展协议标识1
	frame.rsv2	= temp[2];	//扩展协议标识2
	frame.rsv3	= temp[3];	//扩展协议标识3
	frame.opcode	= parseInt(temp.slice(4), 2);	//操作码, 4位

	temp = getNextByte();
	frame.masked	= temp[0] - 0;					//是否掩码处理
	frame.length	= parseInt(temp.slice(1), 2);	//数据长度, 单位是byte

	// 126, 后16位的值为真实长度
	if(frame.length === 126) {
		temp = getNextByte(2);
		frame.length = parseInt(temp, 2);
	}

	// 127, 后64位的值为真实长度
	if(frame.length === 127) {
		temp = getNextByte(8);
		frame.length = parseInt(temp, 2);
	}

	if(frame.masked)	{
		frame.makingKey = [];	//解码密钥, 32位
		frame.makingKey.push(	parseInt(getNextByte(), 2),
								parseInt(getNextByte(), 2),
								parseInt(getNextByte(), 2),
								parseInt(getNextByte(), 2));
	}

	frame.data = new Buffer(frame.length);	//目标数据
	for(var i = 0; i < frame.length; i++) {
		temp = parseInt(getNextByte(), 2);
		if(frame.masked)
			temp ^= frame.makingKey[i % 4];

		frame.data[i] = temp;
	}

	return frame;
};

/**
 * 创建http服务器
 * 并为其挂载了快速监听Upgrade事件的方法listeningUpgrade()
 * 如果对该事件有特别的需求, 可以手动注册
 * 
 * @param {Function} handle 对http服务器事务处理的函数
 * @return {Object} 返回值为服务器实例
 * @private
 */

WebSocket.createServer = function(handle) {
	var server = http.createServer(handle);

	/**
	 * 快速监听Upgrade事件
	 * 
	 * 在作为服务器端和客户端连接时, 需要动态创建WebSocket对象, 因此在服务器注册时
	 * 可以根据需要修改WebSocket模块的事件响应函数, 再传递给服务器注册
	 * For example:
	 * server.listeningUpgrade(WebSocket, [,function(frame) { //TODO }]);
	 * 
	 * @param {Function} wsModule 通过require获取到的WebSocket模块
	 * @param {Array} [listeners] 服务器端WebSocket对象的监听函数数组, 传参时需要按照事件排列监听函数, 事件顺序为[open, message, close, error]
	 * @param {Function} [callback] 事件注册完成后的回调函数
	 * @return {Object} 返回值为服务器实例本身, 用于之后的链式调用
	 * @private
	 */

	server.listeningUpgrade = function(wsModule, listeners, callback) {
		if(listeners) {
			wsModule.prototype.onopen	 = listeners[0];
			wsModule.prototype.onmessage = listeners[1];
			wsModule.prototype.onclose	 = listeners[2];
			wsModule.prototype.onerror	 = listeners[3];
		}

		this.on('upgrade', function(req, socket, upgradeHead) {
			var head = new Buffer(upgradeHead.length);
			upgradeHead.copy(head);

			var key = req.headers['sec-websocket-key'];
			var shasum = crypto.createHash('sha1');
			key = shasum.update(key + WebSocket.hash).digest('base64');

			var headers = [
				'HTTP/1.1 101 Switching Protocols',
				'Upgrade: websocket',
				'Connection: Upgrade',
				'Sec-WebSocket-Accept: ' + key
				//'Sec-WebSocket-Protocol: chat'
			];

			socket.setNoDelay(true);
			socket.write(headers.concat('', '').join('\r\n'));

			var ws = new wsModule();
			ws.setSocket(socket);
		});

		if(callback)	callback();
		return this;
	};

	return server;
};

module.exports = WebSocket;