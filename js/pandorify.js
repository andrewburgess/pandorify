sp = getSpotifyApi(1);

exports.init = init;
exports.createStation = createStation;

var echonestKey = "HRKVFLJESXBJLUDBQ";
var currentTrack = null;
var nextTrack = null;
var jquery = null;
var playlist = null;

function init(j) {
	jquery = j;
	
	playlist = sp.core.getTemporaryPlaylist("Pandorify");
}

function onTrackChanged(event) {
	console.log("SPOTIFY: onTrackChanged Event", event);
	
	if (event.data.curtrack == true && sp.trackPlayer.getIsPlaying() == false) {
		console.log("PANDORIFY: Getting next track");
		getNextTrack();
	}
}

function createStation(artist) {
	console.log("PANDORIFY: Create Station: " + artist);
	localStorage.removeItem("SessionId");
	
	if (artist.length == 0)
		return;

	makeRequest("playlist/dynamic", {"artist": artist, "type": "artist-radio"}, function (data) {
		findTrackOnSpotify(data);
		setTimeout(function () {getNextTrack();}, 2 * 1000);
	});

	sp.trackPlayer.addEventListener("playerStateChanged", onTrackChanged);
}

function findTrackOnSpotify(data, errorCallback) {
	console.info("ECHONEST: Session ID - " + data.session_id);
	localStorage.setItem("SessionId", data.session_id);
	
	var song = data.songs[0];
	var query = song.artist_name + " " + song.title;
	sp.core.search(query, true, true, {
		onSuccess: function (result) {
			console.log("SPOTIFY: Search results for " + query, result);
			if (result.tracks.length > 0) {
				console.log("SPOTIFY: Adding track to playlist", result.tracks[0]);
				playlist.add(result.tracks[0].uri);
				if (sp.trackPlayer.getIsPlaying() == false) {
					console.log("SPOTIFY: Starting temporary playlist", playlist);
					playPlaylist(playlist.uri);
				}
			} else {
				consol.warn("SPOTIFY: No results found");
				if (isFunction(errorCallback)) {
					errorCallback();
				}
			}
		},
		onFailure: function () {
			console.error("SPOTIFY: Search failed for " + query);
			if (isFunction(errorCallback))
				errorCallback();
		}
	});
}

function getNextTrack(callback) {
	makeRequest("playlist/dynamic", {"session_id": localStorage.getItem("SessionId")}, function (data) {
		findTrackOnSpotify(data, getNextTrack);
	});
}

function makeRequest(method, args, callback) {
	args.api_key = echonestKey;
	args.format = "jsonp";
	
	console.log("ECHONEST: " + "http://developer.echonest.com/api/v4/" + method, args);
	$.ajax({
		dataType: "jsonp",
		cache: false,
		data: args,
		url: "http://developer.echonest.com/api/v4/" + method,
		success: function (data) {
			console.log("ECHONEST: Received data", data);
			if (checkResponse(data)) {
				callback(data.response);
			} else {
				console.error("ECHONEST: makeRequest bailed");
			}
		},
		error: function (jqxhr, textStatus, errorThrown) {
			console.error("ECHONEST: Problem making request", jqxhr); 
			console.error(textStatus);
			console.error(errorThrown);
		}		
	});
}

function parseResponse(data) {
	console.log("parseResponse");
	console.log(data);
}

function getSessionInfo(callback) {
	$.getJSON("http://developer.echonest.com/api/v4/playlist/session_info", {"api_key": echonestKey, "session_id": localStorage.getItem("SessionId")},
		function (data) {
		
		}
	);
}

function checkResponse(data) {
	if (data.response) {
		if (data.response.status.code != 0) {
			console.error("Error from EchoNest: " + data.response.status.message);
		} else {
			return true;
		}
	} else {
		console.error("Unexpected response from server");
	}
	
	return false;
}

function playTrack(uri) {
	//console.log("Pretending to play " + uri);
    sp.trackPlayer.playTrackFromUri(uri, {
        onSuccess: function() { } ,
        onFailure: function () { },
        onComplete: function () { }
    });
}

function playPlaylist(uri) {
	sp.trackPlayer.playTrackFromContext(uri, 0, "", {
        onSuccess: function() { 
			sp.trackPlayer.setPlayingContextCanSkipPrev(false);
		} ,
        onFailure: function () { },
        onComplete: function () { }
    });
}

function getImage(data) {
	var type = data.type || ((data.canonicalUsername || data.facebookUid) ? "user" : "");

	switch	(type) {
		case "artist":
			return data.portrait ? data.portrait : "sp://import/img/placeholders/20-artist.png";
		case "album":
			return data.cover ? data.cover : "sp://import/img/placeholders/20-album.png";
		case "track":
			return data.album.cover ? data.album.cover : "sp://import/img/placeholders/20-track.png";
		case "playlist":
			if (data.cover) {
				return data.cover.replace(/spotify:mosaic:([^;]{40}?).*/, "spotify:image:$1");
			}
			else {
				return "sp://import/img/placeholders/20-playlist.png";
			}
		case "user":
			return data.picture ? data.picture : "sp://import/img/placeholders/20-artist.png";
		default:
			return data.image ? data.image : "";
	}
}

function isFunction(obj) {
    return Object.prototype.toString.call(obj) === "[object Function]";
}