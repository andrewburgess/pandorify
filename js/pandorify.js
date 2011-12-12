function Pandorify(echonest) {
	console.log("PANDORIFY: Created");
	this.styles = null;
	this.moods = null;
	this.spotify = getSpotifyApi(1);
	this.echonest = echonest;
	
	this.initialize();
}

Pandorify.prototype.initialize = function() {
	console.log("PANDORIFY: initialize()");
	var p = this;
	if (localStorage.getItem("EchoNestStyles") == null) {
		echonest.makeRequest("artist/list_terms", {"type": "style"}, function (data) {
			p.styles = data.terms;
			localStorage.setItem("EchoNestStyles", p.styles);
		});
	} else {
		this.styles = localStorage.getItem("EchoNestStyles");
	}
	
	if (localStorage.getItem("EchoNestMoods") == null) {
		echonest.makeRequest("artist/list_terms", {"type": "mood"}, function (data) {
			p.moods = data.terms;
			localStorage.setItem("EchoNestMoods", p.moods);
		});
	} else {
		this.moods = localStorage.getItem("EchoNestMoods");
	}
	
	this.spotify.trackPlayer.addEventListener("playerStateChanged", this.onPlayerStateChanged);
}

Pandorify.prototype.createStation = function(artist) {
	console.log("PANDORIFY: Create Station - " + artist);
	var p = this;
	localStorage.removeItem("SessionId");
	
	var playlist = this.getPlaylist();
	while (playlist.length > 0) {
		playlist.remove(0);
	}
	
	if (artist.length == 0)
		return;
		
	this.echonest.makeRequest("playlist/dynamic", {"artist": artist, "type": "artist-radio"}, function (data) {
		p.findTrackOnSpotify(data);
		setTimeout(function () {p.getNextTrack();}, 2 * 1000);
	});
}

Pandorify.prototype.findTrackOnSpotify = function(data, errorCallback) {
	console.info("ECHONEST: Session ID - " + data.session_id);
	var p = this;
	localStorage.setItem("SessionId", data.session_id);
	
	var song = data.songs[0];
	var query = song.artist_name + " " + song.title;
	var playlist = this.getPlaylist();
	this.spotify.core.search(query, true, true, {
		onSuccess: function (result) {
			console.log("SPOTIFY: Search results for " + query, result);
			if (result.tracks.length > 0) {
				console.log("SPOTIFY: Adding track to playlist", result.tracks[0]);
				playlist.add(result.tracks[0].uri);
				if (p.spotify.trackPlayer.getIsPlaying() == false) {
					console.log("SPOTIFY: Starting temporary playlist", playlist);
					p.playPlaylist(playlist.uri);
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

Pandorify.prototype.getNextTrack = function() {
	var p = this;
	echonest.makeRequest("playlist/dynamic", {"session_id": localStorage.getItem("SessionId")}, function (data) {
		p.findTrackOnSpotify(data, p.getNextTrack);
	});
}

Pandorify.prototype.getPlaylist = function() {
	console.log("PANDORIFY: getTemporaryPlaylist()");
	return this.spotify.core.getTemporaryPlaylist("Pandorify");
}

Pandorify.prototype.onPlayerStateChanged = function (event) {
	console.log("SPOTIFY: playerStateChanged", event);
	
	if (event.data.curtrack == true) {
		if (this.spotify.trackPlayer.getPlayingContext()[0] === this.getPlaylist().uri || !this.spotify.trackPlayer.getNowPlayingTrack()) {
			console.log("PANDORIFY: Getting next track");
			this.getNextTrack();
		}
	}
	
	this.updateUI();
}

Pandorify.prototype.getSessionInfo = function() {
	/*$.getJSON("http://developer.echonest.com/api/v4/playlist/session_info", {"api_key": echonestKey, "session_id": localStorage.getItem("SessionId")},
		function (data) {
		
		}
	);*/
}

Pandorify.prototype.playPlaylist = function(uri) {
	var p = this;
	this.spotify.trackPlayer.playTrackFromContext(uri, 0, "", {
        onSuccess: function() { 
			p.spotify.trackPlayer.setPlayingContextCanSkipPrev(false);
			p.spotify.trackPlayer.setPlayingContextCanSkipNext(true);
		} ,
        onFailure: function () { },
        onComplete: function () { }
    });
}

Pandorify.prototype.updateUI = function() {
	console.log("PANDORIFY: Updating UI");
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