var config = {
	route: 'RESTful',				// 路由模式: 有 "MVC" 和 "RESTful" 两种, 静态文件模块对 "MVC" 模式支持还不完善, 慎用
	defaultController: 'index',		// MVC模式下的默认控制器
	defaultAction: 'default',		// MVC模式下的默认方法
	max_MB: 1,						// 上传文件限制大小, 单位MB
	sessionExpires: 10,				// session过期时间, 单位分钟
	methods: ['get',				// 路由支持的请求方法，可自行扩展
			  'post',
			  'put',
			  'delete'],
	staticType: {'js': 'text/javascript',	// 支持的静态文件类型，可自行扩展
				 'css': 'text/css',
				 'jpg': 'image/jpeg',
				 'jpeg': 'image/jpeg',
				 'png': 'image/png',
				 'gif': 'image/gif',
				 'ico': 'image/x-icon',
				 'woff': 'application/x-font-woff'}
};

module.exports = config;