'use strict';

var Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	request = require('request'),
	utils = require('./utils'),
	util = require('util'),
	path = require('path'),
	prompt = require('prompt'),
	env = process.env;

function api(method, params, callback) {
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
				// captcha error
				if (res.body.error.error_code === 14) {
					handleCaptchaError(method, params, res, this.slot());
				} else {
					throw new Error(util.format('VK API error: %d, %s',
						res.body.error.error_code,
						res.body.error.error_msg));
				}
			} else {
				this.pass(res.body.response);
			}
		},
		callback
	);
};

function handleCaptchaError(method, params, res, callback) {
	var captchaDest = path.join(process.cwd(), 'captcha.jpg');
	Steppy(
		function() {
			if (!res.body.error.captcha_sid ||
				!res.body.error.captcha_img) {

				throw new Error('Can\'t get captcha image');
			}

			utils.downloadFile(
				res.body.error.captcha_img,
				captchaDest,
				this.slot()
			);
		},
		function(err) {
			console.log('input captcha from %s', captchaDest);
			prompt.start();
			prompt.get(['captcha'], this.slot());
		},
		function(err, input) {
			api(method, _(params).extend({
				captcha_sid: res.body.error.captcha_sid,
				captcha_key: input.captcha
			}), this.slot());
		},
		callback
	);
}

module.exports = api;