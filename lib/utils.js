'use strict';

var Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	path = require('path'),
	fs = require('fs'),
	mkdirp = require('mkdirp'),
	request = require('request'),
	multipipe = require('multipipe');

function zeroPad(number, zeros) {
	return Array(zeros - number.toString().length + 1).join("0") + number;
}

function padRight(str, length, char) {
	return str + Array(length - str.length + 1).join(char || ' ');
}

function crop(str, length) {
	if (str.length <= length) return str;
	return str.slice(0, length - 3) + '...';
}

// dest should include file name
function downloadFile(url, dest, callback) {
	var req = request(url);
	Steppy(
		function() {
			mkdirp(path.dirname(dest), this.slot());
		},
		function() {
			multipipe(
				req,
				fs.createWriteStream(dest),
				this.slot()
			);
		},
		callback
	);
	return req;
}

module.exports.zeroPad = zeroPad;
module.exports.downloadFile = downloadFile;
module.exports.padRight = padRight;
module.exports.crop = crop;