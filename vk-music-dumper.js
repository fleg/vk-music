//just in case
var http = require("http");
http.globalAgent.maxSockets = 5;

var request = require("request"),
	Steppy = require("twostep").Steppy,
	_ = require("underscore"),
	fs = require("fs"),
	mkdirp = require("mkdirp"),
	path = require("path"),
	async = require("async"),
	sanitize = require("sanitize-filename");

//https://oauth.vk.com/authorize?client_id={VK_APP_ID}&scope=audio&redirect_uri=http://oauth.vk.com/blank.html&display=page&response_type=token
var VK_USER_ID = process.env.VK_USER_ID || null,
	VK_ACCESS_TOKEN = process.env.VK_ACCESS_TOKEN || null;
	
if(!VK_USER_ID || !VK_ACCESS_TOKEN) {
	console.error("required VK_USER_ID, VK_ACCESS_TOKEN");
	process.exit(1);
}

var destination = process.argv[2] || "./";
	
function api(method, params, callback) {
	params = _({
		v: "5.35",
		lang: "ru",
		access_token: VK_ACCESS_TOKEN
	}).extend(params);
	
	Steppy(
		function() {
			request({
				method: "GET",
				url: "https://api.vk.com/method/" + method,
				json: true,
				qs: params
			}, this.slot());
		},
		function(err, res) {
			if(res.body.error) {
				throw res.body.error;
			}
			
			this.pass(res.body.response);
		},
		callback
	);
}

function downloadFile(name, from, to, callback) {
	Steppy(
		function() {
			mkdirp(to, this.slot());
		},
		function() {
			var slot = this.slot();
			
			request(from)
				.pipe(fs.createWriteStream(path.join(to, name)))
				.on("error", slot)
				.on("close", slot);
		},
		callback
	);
}

function zeroPad(number, zeros) {
	return Array(zeros - number.toString().length + 1).join("0") + number;
}

function main() {
	Steppy(
		function getAudiosAndAlbums() {
			api("audio.get", {
				owner_id: VK_USER_ID,
				need_user: 0,
				count: 6000
			}, this.slot());
			
			//TODO get all albums
			api("audio.getAlbums", {
				owner_id: VK_USER_ID,
				count: 100
			}, this.slot());
		},
		function transform(err, audios, albums) {
			audios = audios.items;
			albums = albums.items;
			
			albums = _.object(
				_(albums).pluck("id"),
				_(albums).pluck("title")
			);
			
			var byAlbums = _(audios).chain()
				.groupBy("album_id")
				.reduce(function(result, tracks, albumId) {
					result[albums[albumId] || albumId] = tracks;
					return result;
				}, {})
				.value();
			
			this.pass(byAlbums);
		},
		function download(err, byAlbums) {
			//series donwnloading albums
			async.eachOfSeries(byAlbums, function(audios, album, callback) {
				console.log("downloading `" + album + "` album");
				
				//five audios in parallel
				//use eachOf because of index in iterator
				async.eachOfLimit(audios, 5, function(audio, index, callback) {
					var name = audio.artist + " - " + audio.title;
					var to = destination;
					//if audio in album prepend index to name
					//and download in album directory
					if(album !== "undefined") {
						name = zeroPad(index, 2) + " " + name;
						to = path.join(to, sanitize(album));
					}
					
					console.log("  downloading `" + name + "`");
					
					downloadFile(sanitize(name) + ".mp3",
						audio.url, to, callback);
				}, callback);
				
			}, this.slot());
		},
		function(err) {
			if(err) {
				console.error(err.stack || err);
				process.exit(1);
			}
		}
	);
}

main();
