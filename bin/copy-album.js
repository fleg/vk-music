#!/usr/bin/env node

'use strict';

require('dotenv').config({silent: true});

if (!process.env.VK_ACCESS_TOKEN) {
	console.error('VK_ACCESS_TOKEN is required');
	return process.exit(1);
}

var Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	async = require('async'),
	api = require('../lib/api'),
	utils = require('../lib/utils');

var argv = require('yargs')
    .usage('Usage: $0 [options]')
    .demand('owner')
    .describe('owner', 'music owner id')
    .demand('id', './')
    .describe('id', 'album id')
    .argv;

function findAlbum(callback) {
	var finished = false,
		offset = 0,
		album;

	Steppy(
		function() {
			async.whilst(function() {
				return !finished;
			}, function(callback) {
				Steppy(
					function() {
						api('audio.getAlbums', {
							owner_id: argv.owner,
							offset: offset,
							count: 100
						}, this.slot());
					},
					function(err, albums) {
						album = _(albums.items)
							.findWhere({id: argv.id});

						offset += albums.items.length;

						if (album || offset >= albums.count) {
							finished = true;
						}

						// limit api requests
						setTimeout(this.slot(), 1000);
					},
					callback
				);
			}, this.slot());
		},
		function() {
			this.pass(album);
		},
		callback
	);
}

Steppy(
	function() {
		findAlbum(this.slot());
	},
	function(err, album) {
		if (!album) {
			throw new Error('album not found');
		}

		this.pass(album);

		api('audio.addAlbum', {
			title: album.title
		}, this.slot());

		api('audio.get', {
			owner_id: argv.owner,
			album_id: argv.id,
			need_user: 0,
			count: 6000
		}, this.slot());
	},
	function(err, album, myAlbum, audios) {
		console.log('copying `%s` album', album.title);

		// keep order and reverse source audios
		audios = audios.items.reverse();

		async.eachSeries(audios, function(audio, callback) {
			console.log('adding %s', audio.title);

			Steppy(
				function() {
					api('audio.add', {
						audio_id: audio.id,
						owner_id: argv.owner,
						album_id: myAlbum.album_id
					}, this.slot());
				},
				function() {
					// limit api requests
					setTimeout(this.slot(), 1000);
				},
				callback
			);

		}, this.slot());
	},
	function(err) {
		if (err) {
			console.error(err.stack || err);
			return process.exit(1);
		}

		console.log('complete!');
	}
);
