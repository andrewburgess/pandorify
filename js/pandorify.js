sp = getSpotifyApi(1);

exports.init = init;
exports.createStation = createStation;

var echonestKey = "HRKVFLJESXBJLUDBQ";
var currentTrack = null;
var nextTrack = null;

function init() {
	console.log("init");
	console.log(sp.trackPlayer);
}

function onTrackChanged(event) {
	console.log(event);
	
	if (event.data.curtrack == true && sp.trackPlayer.getIsPlaying() == false) {
		console.log("Getting next track");
		getNextTrack({"session_id": localStorage.getItem("SessionId")});
	}
}

function createStation(artist) {
	console.log("Create Station: " + artist);
	
	if (artist.length == 0)
		return;

	getNextTrack({'artist': artist, 'type': 'artist-radio'});

	sp.trackPlayer.addEventListener("playerStateChanged", onTrackChanged);
}

function getNextTrack(args) {
	args.api_key = echonestKey;
	args.format = "json";
	$.getJSON("http://developer.echonest.com/api/v4/playlist/dynamic", args, 
		function (data) {
			if (checkResponse(data)) {
				console.log("Session ID: " + data.response.session_id);
				localStorage.setItem("SessionId", data.response.session_id);
				var song = data.response.songs[0];
				
				console.log("Received track: " + song.artist_name + " - " + song.title);
				var query = song.artist_name + " " + song.title;
				console.log("Searching for " + query);
				sp.core.search(query, true, true, {
					onSuccess: function (result) {
						console.log(result);
						if (result.tracks.length > 0) {
							console.log(result.tracks[0].uri);
							
							playTrack(result.tracks[0].uri);
						} else {
							console.log("No results found")
						}
					},
					onFailure: function() {
						console.error("Search failed");
					}
				});
			} else {
				console.log("Problem fetching results");
			}
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
        onSuccess: function() { console.log("success");} ,
        onFailure: function () { console.log("failure");},
        onComplete: function () { console.log("complete"); }
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