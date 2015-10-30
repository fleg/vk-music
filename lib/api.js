'use strict';

var Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	request = require('request'),
	env = process.env;

module.exports = function api(method, params, callback) {
	params = _({
		v: '5.35',
		lang: 'ru',
		access_token: env.VK_ACCESS_TOKEN
	}).extend(params);

	Steppy(
		function() {
			request({
				method: 'GET',
				url: 'https://api.vk.com/method/' + method,
				json: true,
				qs: params
			}, this.slot());
		},
		function(err, res) {
			if (res.body.error) {
				throw new Error(res.body.error);
			}

			this.pass(res.body.response);
		},
		callback
	);
};