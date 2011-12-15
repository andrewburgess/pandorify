var views = sp.require("sp://import/scripts/api/views");
var models = sp.require("sp://import/scripts/api/models");
var ui = sp.require("sp://import/scripts/ui");

styles = null;
moods = null;
playlist = new models.Playlist();
playlistDisplay = new views.List(playlist, function (track) {
	return new views.Track(track, views.Track.FIELD.STAR | views.Track.FIELD.SHARE | views.Track.FIELD.NAME | views.Track.FIELD.ARTIST | views.Track.FIELD.DURATION | views.Track.FIELD.ALBUM);
});

var artistImage = new ui.SPImage("sp://import/img/placeholders/300-album.png");

function initialize() {
	console.log("PANDORIFY: initialize()");
	
	$("#playlist").append(playlistDisplay.node);
	$("#artist-image").append(artistImage.node);
	
	if (localStorage.getItem("EchoNestStyles") == null) {
		echonest.makeRequest("artist/list_terms", {"type": "style"}, function (data) {
			styles = data.terms;
			localStorage.setItem("EchoNestStyles", styles);
		});
	} else {
		styles = localStorage.getItem("EchoNestStyles");
	}
	
	if (localStorage.getItem("EchoNestMoods") == null) {
		echonest.makeRequest("artist/list_terms", {"type": "mood"}, function (data) {
			moods = data.terms;
			localStorage.setItem("EchoNestMoods", moods);
		});
	} else {
		moods = localStorage.getItem("EchoNestMoods");
	}
	
	sp.trackPlayer.addEventListener("playerStateChanged", onPlayerStateChanged);
	
	$("#save-playlist").attr("value", playlist.uri);
}

function createStation(artist) {
	console.log("PANDORIFY: Create Station - " + artist);
	localStorage.removeItem("SessionId");
	
	if (artist.length == 0)
		return;
	
	playlist.name = "Pandorify: " + artist;
	
	while (playlist.length > 0) {
		playlist.remove(0);
	}
		
	echonest.makeRequest("playlist/dynamic", {"artist": artist, "type": "artist-radio"}, function (data) {
		findTrackOnSpotify(data);
		setTimeout(function () {getNextTrack();}, 2 * 1000);
	});
	
	$("#playlist-header").find("h2").html("Pandorify: " + artist);
	$("#save-playlist").show();
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
				console.warn("SPOTIFY: No results found");
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

function getNextTrack() {
	echonest.makeRequest("playlist/dynamic", {"session_id": localStorage.getItem("SessionId")}, function (data) {
		findTrackOnSpotify(data, getNextTrack);
	});
}

function onPlayerStateChanged(event) {
	console.log("SPOTIFY: playerStateChanged", event);
	
	if (event.data.curtrack == true) {
		if (sp.trackPlayer.getPlayingContext()[0] === playlist.uri || !sp.trackPlayer.getNowPlayingTrack()) {
			getNextTrack();
			
			updateUI();
		}
	}
}

function playPlaylist(uri) {
	sp.trackPlayer.playTrackFromContext(uri, 0, "", {
        onSuccess: function() { 
			sp.trackPlayer.setPlayingContextCanSkipPrev(false);
			sp.trackPlayer.setPlayingContextCanSkipNext(true);
		} ,
        onFailure: function () { },
        onComplete: function () { }
    });
}

function updateUI() {
	console.log("PANDORIFY: Updating UI");
	
	var track = sp.trackPlayer.getNowPlayingTrack().track;
	artistImage = new SPImage(track.album.cover, track.uri, track.name);
	$("#artist-image").empty();
	$("#artist-image").append(artistImage.node);
}

function getImage(data) {
	var type = data.type || ((data.canonicalUsername || data.facebookUid) ? "user" : "");

	switch	(type) {
		case "artist":
			return data.portrait ? data.portrait : "sp://import/img/placeholders/128-artist.png";
		case "album":
			return data.cover ? data.cover : "sp://import/img/placeholders/300-album.png";
		case "track":
			return data.album.cover ? data.album.cover : "sp://import/img/placeholders/300-ablum.png";
		case "playlist":
			if (data.cover) {
				return data.cover.replace(/spotify:mosaic:([^;]{40}?).*/, "spotify:image:$1");
			}
			else {
				return "sp://import/img/placeholders/50-playlist.png";
			}
		case "user":
			return data.picture ? data.picture : "sp://import/img/placeholders/128-artist.png";
		default:
			return data.image ? data.image : "";
	}
}

function isFunction(obj) {
    return Object.prototype.toString.call(obj) === "[object Function]";
}