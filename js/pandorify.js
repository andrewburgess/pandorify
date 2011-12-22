var views = sp.require("sp://import/scripts/api/views");
var models = sp.require("sp://import/scripts/api/models");
var ui = sp.require("sp://import/scripts/ui");

styles = new Array();
moods = new Array();

var artistImage = new ui.SPImage("sp://import/img/placeholders/300-album.png");

var radio = new Radio();

function initialize() {
	console.log("PANDORIFY: initialize()");
	
	$("#radio").hide();
	
	$("#radio-search").watermark("Search for artists, songs, or descriptions...");
	$("#radio-search").keyup(Autocompleter.interceptKeypress);
	
	$("#playlist").append(radio.playlistDisplay.node);
	
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
	
	setupSearchContainers();
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
	
	$("#start").fadeOut("fast", function() {
		$("#radio").fadeIn("fast");
	});
	
	sp.trackPlayer.addEventListener("playerStateChanged", playerStateChanged);
}

function playerStateChanged(event) {
	if (event.data.curtrack == true && sp.trackPlayer.getPlayingContext()[0] === radio.tempPlaylist.uri) {
		var track = sp.trackPlayer.getNowPlayingTrack().track;
		$("#artist-image").empty();
		var img = new ui.SPImage(track.album.cover);
		$(radio.playerImage.image).append(img.node);
		$("#artist-image").append(radio.playerImage.node);
		$("#track-name").html(track.name.decodeForText());
		$("#album-name").empty();
		$("#album-name").append($(document.createElement("a")).attr("href", track.album.uri).text(track.album.name.decodeForText()));
		$("#artist-name").empty();
		getArtistNameLinkList($("#artist-name"), track.artists);
	}
}

function autocompleteSearch() {
	var search = $("#radio-search").val();
	if (search.length == 0) {
		setupSearchContainers();
		return;
	}
	sp.core.search(search + "*", true, true, {
		onSuccess: processSearchResults,
		onFailure: function() {
		
		}
	});
	
	$("#description-results").empty();
	for (var x in styles) {
		if (styles[x].startsWith(search)) {
			$("#description-results").append("<div class='description-result'>" + styles[x] + "</div>");
		}
	}
	
	for (var x in moods) {
		if (moods[x].startsWith(search)) {
			$("#description-results").append("<div class='description-result'>" + moods[x] + "</div>");
		}
	}
	
	$("#description-results").find($(".description-result:even")).addClass("result-even");
	
	
	$(".description-result").click(function() {
		startStation("description", $(this).text());
	});
}

function processSearchResults(result) {
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
			
			var trackArtists = getArtistNameList(result.tracks[i].artists);
			
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
}

function setupSearchContainers() {
	var a = sp.core.library.getArtists();
	var t = sp.core.library.getTracks();
	
	var artists = new Array();
	var tracks = new Array();
	
	for (var i = 0; i < Math.min(a.length, 10); i++) {
		var index = Math.floor(Math.random() * a.length);
		artists.push(a[index]);
	}
	
	for (var i = 0; i < Math.min(t.length, 10); i++) {
		var index = Math.floor(Math.random() * t.length);
		tracks.push(t[index]);
	}
	
	processSearchResults({"artists": artists, "tracks": tracks});
	

	$("#description-results").empty();
	for (var x in styles) {
		$("#description-results").append("<div class='description-result'>" + styles[x] + "</div>");
	}
	
	for (var x in moods) {
		$("#description-results").append("<div class='description-result'>" + moods[x] + "</div>");
	}
	
	$("#description-results").find($(".description-result:even")).addClass("result-even");
	
	
	$(".description-result").click(function() {
		startStation("description", $(this).text());
	});
}