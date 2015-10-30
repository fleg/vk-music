#!/usr/bin/env node

'use strict';

require('dotenv').config({silent: true});

// limit parallel downloads, just in case
var http = require('http');
http.globalAgent.maxSockets = 5;

var Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	path = require('path'),
	async = require('async'),
	sanitize = require('sanitize-filename'),
	MultiProgress = require('multi-progress'),
	api = require('../lib/api'),
	utils = require('../lib/utils');

var argv = require('yargs')
    .usage('Usage: $0 [options]')
    .demand('owner')
    .describe('owner', 'music owner id')
    .default('dest', './')
    .describe('dest', 'where save music')
    .argv;

Steppy(
	function getAudiosAndAlbums() {
		api('audio.get', {
			owner_id: argv.owner,
			need_user: 0,
			count: 6000
		}, this.slot());

		//TODO get all albums
		api('audio.getAlbums', {
			owner_id: argv.owner,
			count: 100
		}, this.slot());
	},
	function transform(err, audios, albums) {
		audios = audios.items;
		albums = albums.items;

		console.log('found %d albums', albums.length);
		console.log('found %d audios', audios.length);

		albums = _.object(
			_(albums).pluck('id'),
			_(albums).pluck('title')
		);

		var byAlbums = _(audios).chain()
			.groupBy('album_id')
			.reduce(function(result, tracks, albumId) {
				result[albums[albumId] || albumId] = tracks;
				return result;
			}, {})
			.value();

		this.pass(byAlbums);
	},
	function download(err, byAlbums) {
		var multi = new MultiProgress();

		//series donwnloading albums
		async.eachOfSeries(byAlbums, function(audios, album, callback) {
			console.log('');
			console.log('downloading `' + album + '` album');

			//five audios in parallel
			//use eachOf because of index in iterator
			async.eachOfLimit(audios, 5, function(audio, index, callback) {
				var name = audio.artist + ' - ' + audio.title,
					to = argv.dest,
					bar;
				//if audio in album prepend index to name
				//and download in album directory
				if (album !== 'undefined') {
					name = utils.zeroPad(index, 2) + ' ' + name;
					to = path.join(to, sanitize(album));
				}

				to = path.join(to, sanitize(name) + '.mp3');

				utils.downloadFile(audio.url, to, callback)
					.on('response', function(res) {
						var size = Number(res.headers['content-length']),
							title = utils.crop(audio.title, 40),
							barStr = '  ' +
								utils.padRight(title, 40, '.') +
								' [:bar] :percent :etas';

						bar = multi.newBar(barStr, {
							complete: '=',
							incomplete: ' ',
							width: 20,
							total: size
						});
					})
					.on('data', function(chunk) {
						bar.tick(chunk.length);
					});
			}, callback);

		}, this.slot());
	},
	function(err) {
		if (err) {
			console.error(err.stack || err);
			process.exit(1);
		}
	}
);
