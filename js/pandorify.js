sp = getSpotifyApi(1);

exports.init = init;
exports.createStation = createStation;

var echonestKey = "HRKVFLJESXBJLUDBQ";

function init() {
	console.log("init");
}

function onTrackChanged(event) {

}

function createStation(artist) {
	console.log("Create Station: " + artist);
	
	if (artist.length == 0)
		return;

	var baseUrl = "http://developer.echonest.com/api/v4/playlist/dynamic"
	
	$.getJSON(baseUrl, {'artist': artist, 'format': 'json', 'type': 'artist-radio', 'api_key': echonestKey}, 
		function (data) {
			if (checkResponse(data)) {
				console.log("Session ID: " + data.response.session_id);
				localStorage.setItem("SessionId", data.response.session_id);
				var song = data.response.songs[0];
				
				console.log("Received track: " + song.artist_name + " - " + song.title);
				var query = song.artist_name + " " + song.title;
				sp.core.search(query, true, true, {
					onSuccess: function (result) {
						if (result.tracks.length > 0) {
							console.log("Possible SP track: " + result.tracks[0].uri);
						}
					},
					onFailure: function() {
					
					}
				});
			} else {
				console.log("Problem fetching results");
			}
		}
	);

	//sp.trackPlayer.addEventListener("playerStateChanged", onTrackChanged);
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