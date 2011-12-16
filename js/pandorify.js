var views = sp.require("sp://import/scripts/api/views");
var models = sp.require("sp://import/scripts/api/models");
var ui = sp.require("sp://import/scripts/ui");

styles = new Array();
moods = new Array();
playlist = new models.Playlist();
playlistDisplay = new views.List(playlist, function (track) {
	return new views.Track(track, views.Track.FIELD.STAR | views.Track.FIELD.SHARE | views.Track.FIELD.NAME | views.Track.FIELD.ARTIST | views.Track.FIELD.DURATION | views.Track.FIELD.ALBUM);
});

var artistImage = new ui.SPImage("sp://import/img/placeholders/300-album.png");

function initialize() {
	console.log("PANDORIFY: initialize()");
	
	//$("#playlist").append(playlistDisplay.node);
	//$("#artist-image").append(artistImage.node);
	
	if (localStorage.getItem("EchoNestStyles") == null) {
		echonest.makeRequest("artist/list_terms", {"type": "style"}, function (data) {
			for (var i = 0; i < data.terms.length; i++)
				styles.push(data.terms[i].name);
			localStorage.setItem("EchoNestStyles", JSON.stringify(styles));
		});
	} else {
		styles = JSON.parse(localStorage.getItem("EchoNestStyles"));
	}
	
	if (localStorage.getItem("EchoNestMoods") == null) {
		echonest.makeRequest("artist/list_terms", {"type": "mood"}, function (data) {
			for (var i = 0; i < data.terms.length; i++)
				moods.push(data.terms[i].name);
			localStorage.setItem("EchoNestMoods", JSON.stringify(moods));
		});
	} else {
		moods = JSON.parse(localStorage.getItem("EchoNestMoods"));
	}
	
	sp.trackPlayer.addEventListener("playerStateChanged", onPlayerStateChanged);
	
	//$("#save-playlist").attr("value", playlist.uri);
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

function autocompleteSearch() {
	var search = $("#radio-search").val();
	if (search.length == 0) {
		$("#description-results").empty();
		$("#spotify-results").empty();
		return;
	}
	
	console.log("Autocomplete " + search);
	sp.core.search(search, true, true, {
		onSuccess: function(result) {
			var artistDiv = $(document.createElement("div"));
			var trackDiv = $(document.createElement("div"));
			
			if (result.artists.length > 0) {
				artistDiv.append($(document.createElement("strong")).html("Artist Results"));
				artistDiv.append($(document.createElement("hr")));
				
				var total = Math.min(10, result.artists.length);
				for (var i = 0; i < total; i++) {
					var aDiv = $(document.createElement("div")).addClass("artist-result");
					var imgDiv = $(document.createElement("div")).addClass("left").addClass("artist-search-image");
					var img = new ui.SPImage(result.artists[i].portrait.length > 0 ? result.artists[i].portrait : "sp://import/img/placeholders/64-artist.png");
					imgDiv.append(img.node);
					aDiv.append(imgDiv);
					aDiv.append(result.artists[i].name.decodeForText());
					artistDiv.append(aDiv);
					artistDiv.append($(document.createElement("div")).addClass("clear"));
				}

				artistDiv.find(".artist-result:even").addClass("result-even");
			}
			
			if (result.tracks.length > 0) {
				trackDiv.append($(document.createElement("strong")).html("Song Results"));
				trackDiv.append($(document.createElement("hr")));
				
				var total = Math.min(10, result.tracks.length);
				for (var i = 0; i < total; i++) {
					var aDiv = $(document.createElement("div")).addClass("song-result");
					var imgDiv = $(document.createElement("div")).addClass("left").addClass("song-search-image");
					var img = new ui.SPImage(result.tracks[i].album.cover.length > 0 ? result.tracks[i].album.cover : "sp://import/img/placeholders/50-album.png");

					imgDiv.append(img.node);
					aDiv.append(imgDiv);
					aDiv.append($(document.createElement("div")).html(result.tracks[i].name.decodeForText()).addClass("song-search-title"));

					var trackArtists = result.tracks[i].artists[0].name;
					for (var j = 1; j < result.tracks[i].artists.length; j++) {
						trackArtists += ", " + result.tracks[i].artists[j].name;
					}

					aDiv.append($(document.createElement("div")).html(trackArtists).addClass("song-search-artist"));
					trackDiv.append(aDiv);
					trackDiv.append($(document.createElement("div")).addClass("clear"));

				}
				
				trackDiv.find(".song-result:even").addClass("result-even");
			}
			
			$("#spotify-results").empty();
			$("#spotify-results").append(artistDiv.css("margin-bottom", 30));
			$("#spotify-results").append(trackDiv);
			
			$.each(trackDiv.find(".song-result"), function(index, value) {
				console.log($(value).height());
				if ($(value).height() > 34) {
					$(value).find(".song-search-image").css("margin-top", -7 + ($(value).height() - 34) / 2);
				}
			});
		},
		onFailure: function() {
		
		}
	});
	
	$("#description-results").empty();
	for (var x in moods) {
		if (moods[x].startsWith(search)) {
			$("#description-results").append("<div class='description-result'>" + moods[x] + "</div>");
		}
	}
	
	for (var x in styles) {
		if (styles[x].startsWith(search)) {
			$("#description-results").append("<div class='description-result'>" + styles[x] + "</div>");
		}
	}
	
	$("#description-results").find($(".description-result:even")).addClass("result-even");
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
	//$("#artist-image").empty();
	//$("#artist-image").append(artistImage.node);
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

function isRadioPlaying() {
	return (sp.trackPlayer.getPlayingContext()[0] === playlist.uri && sp.trackPlayer.getNowPlayingTrack());
}