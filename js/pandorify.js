var views = sp.require("sp://import/scripts/api/views");
var models = sp.require("sp://import/scripts/api/models");
var ui = sp.require("sp://import/scripts/ui");

styles = new Array();
moods = new Array();

var artistImage = new ui.SPImage("sp://import/img/placeholders/300-album.png");

var radio = new Radio();

function initialize() {
	console.log("PANDORIFY: initialize()");
	
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

function startStation(type, uri) {
	switch (type) {
		case "description":
			radio.createDescriptionStation(uri);
			break;
		case "artist":
			models.Artist.fromURI(uri, function(artist) {
				radio.createArtistStation(artist);
			});
			break;
		case "track":
			models.Track.fromURI(uri, function(track) {
				radio.createTrackStation(track);
			});			
			break;
	}
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
					aDiv.attr("data-uri", result.artists[i].uri);
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
					aDiv.attr("data-uri", result.tracks[i].uri);
					trackDiv.append(aDiv);
					trackDiv.append($(document.createElement("div")).addClass("clear"));

				}
				
				trackDiv.find(".song-result:even").addClass("result-even");
			}
			
			$("#spotify-results").empty().show();
			$("#spotify-results").append(artistDiv.css("margin-bottom", 30));
			$("#spotify-results").append(trackDiv);
			
			$.each(trackDiv.find(".song-result"), function(index, value) {
				if ($(value).height() > 34) {
					$(value).find(".song-search-image").css("margin-top", -9 + ($(value).height() - 36) / 2);
				}
			});
			
			$.each(artistDiv.find(".artist-result"), function(index, value) {
				if ($(value).height() > 17) {
					$(value).find(".artist-search-image").css("margin-top", -7);
				}
			});
			
			$(".artist-result").click(function() {
				console.log($(this));
				startStation("artist", $(this).attr("data-uri"));
			});
			
			$(".song-result").click(function() {
				console.log($(this));
				startStation("track", $(this).attr("data-uri"));
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
	
	
	$(".description-result").click(function() {
		startStation("description", $(this).text());
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

function isFunction(obj) {
    return Object.prototype.toString.call(obj) === "[object Function]";
}

function isRadioPlaying() {
	return (sp.trackPlayer.getPlayingContext()[0] === radio.playlist.uri && sp.trackPlayer.getNowPlayingTrack());
}