var views = sp.require("sp://import/scripts/api/views");
var models = sp.require("sp://import/scripts/api/models");
var ui = sp.require("sp://import/scripts/ui");

styles = new Array();
moods = new Array();
savedStations = new Array();

var artistImage = new ui.SPImage("sp://import/img/placeholders/300-album.png");

var radio = new Radio();

radio.sessionInfoReceived = processSessionInfo;

sp.core.addEventListener("argumentsChanged", handleArgsChanged);

$(document).ready(function() {
	$("#ban-artist").click(function(e) {
		radio.banArtist();
		
		e.preventDefault();
	});
	
	$("#ban-track").click(function(e) {
		radio.banTrack();
		
		e.preventDefault();
	});
});

function handleArgsChanged() {
	console.log("args changed", sp.core.getArguments());

	var args = sp.core.getArguments();
	switch (args[0]) {
		case "create":
			$("#radio-search").val("");
			setupSearchContainers();
		
			$("#create-station").show();
			$("#radio").hide();
			break;
		case "radio":
			$("#radio").show();
			$("#create-station").hide();
		
			break;
	}
}

function setCurrentlyPlayingTrack() {
	if (sp.trackPlayer.getPlayingContext()[0] === radio.tempPlaylist.uri) {
		var track = sp.trackPlayer.getNowPlayingTrack().track;
		$("#artist-image").empty().append($(document.createElement("a")).attr("href", track.uri));
		var img = new ui.SPImage(track.album.cover);
		$(radio.playerImage.image).empty();
		$(radio.playerImage.image).append(img.node);
		$("#artist-image").children().append(radio.playerImage.node);
		$("#track-name").empty().append($(document.createElement("a")).attr("href", track.album.uri).text(track.name.decodeForText()));
		getArtistNameLinkList($("#artist-name").empty(), track.artists);
	}
}

function processSessionInfo(data) {
	$("#session-terms").empty();
	for (var i = 0; i < data.terms.length; i++) {
		var next = $(document.createElement("div")).addClass("session-term");
		var width = Math.round(data.terms[i].frequency * 100);
		var amountDiv = $(document.createElement("div")).addClass("session-amount");
		amountDiv.css("width", width + "%");
		next.append($(document.createElement("div")).addClass("session-description").text(data.terms[i].name));
		next.append(amountDiv);
		
		$("#session-terms").append(next);
	}
	
	var maxHeight = Math.round($(document).height() * 0.9);
	var maxWidth = Math.round($(document).width() * 0.9);
	
	$("#session-info").
						css("max-height", maxHeight).
						css("max-width", maxWidth).
						css("overflow-y", "scroll").
						height(maxHeight).
						width(maxWidth);
						
	$("#session-info").dialog({autoOpen: false, maxWidth: maxWidth, maxHeight: maxHeight, height: maxHeight, width: maxWidth});
}

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
	
	if (localStorage.getItem("SavedStations") != null) {
		savedStations = JSON.parse(localStorage.getItem("SavedStations"));
	}
	
}

function startStation(type, uri) {
	window.location = "spotify:app:pandorify:radio";
	switch (type) {
		case "description":
			radio.createDescriptionStation(uri);
			$("#radio").find("h2").find("span").html("based on " + uri);
			break;
		case "artist":
			models.Artist.fromURI(uri, function(artist) {
				radio.createArtistStation(artist);
				$("#radio").find("h2").find("span").append("based on ").append($(document.createElement("a")).attr("href", uri).text(artist.name.decodeForText()));
			});
			break;
		case "track":
			models.Track.fromURI(uri, function(track) {
				radio.createTrackStation(track);
				
				$("#radio").find("h2").find("span").append("based on ").append($(document.createElement("a")).attr("href", track.album.uri).text(track.name.decodeForText())).append(" by ");
				$("#radio").find("h2").find("span").append($(document.createElement("a")).attr("href", track.artists[0].uri).text(track.artists[0].name.decodeForText()));
				for (var i = 1; i < track.artists.length; i++) {
					$("#radio").find("h2").find("span").append(", ").append($(document.createElement("a")).attr("href", track.artists[i].uri).text(track.artists[i].name.decodeForText()));
				}
			});	
			break;
	}
	
	sp.trackPlayer.addEventListener("playerStateChanged", playerStateChanged);
}

function playerStateChanged(event) {
	if (event.data.curtrack == true && sp.trackPlayer.getPlayingContext()[0] === radio.tempPlaylist.uri) {
		var track = sp.trackPlayer.getNowPlayingTrack().track;
		$("#artist-image").empty().append($(document.createElement("a")).attr("href", track.uri));
		var img = new ui.SPImage(track.album.cover);
		$(radio.playerImage.image).empty();
		$(radio.playerImage.image).append(img.node);
		$("#artist-image").children().append(radio.playerImage.node);
		$("#track-name").empty().append($(document.createElement("a")).attr("href", track.album.uri).text(track.name.decodeForText()));
		$("#album-name").empty().append($(document.createElement("a")).attr("href", track.album.uri).text(track.album.name.decodeForText()));
		getArtistNameLinkList($("#artist-name").empty(), track.artists);
		
		updateHistory();
	}
}

function updateHistory() {
	console.log("Updating history");
	if (radio.tempPlaylist.length == 1)
		return;
		
	if (radio.currentTrack == null) {
		radio.currentTrack = sp.trackPlayer.getNowPlayingTrack().track.uri;
		return;
	}
	
	models.Track.fromURI(radio.currentTrack, function(track) {
		console.log(track);
		var el = $(document.createElement("div")).css("padding-bottom", "5px");
		el.append($(document.createElement("div")).addClass("history-image").append($(document.createElement("a")).attr("href", track.data.album.uri)));
		var img = new ui.SPImage(track.data.album.cover);
		el.children().children().append(img.node);
		el.append($(document.createElement("div")).text(track.data.name.decodeForText()));
		var artists = $(document.createElement("div"));
		getArtistNameLinkList(artists, track.data.artists);
		el.append(artists);
		el.append($(document.createElement("div")).addClass("clear"));
		
		$("#play-history").prepend(el);
		
		radio.currentTrack = sp.trackPlayer.getNowPlayingTrack().track.uri;
	});
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
	$("#spotify-results").empty().show();
	processArtists(result.artists);
	processTracks(result.tracks);	
}

function processArtists(artists) {
	var artistDiv = $(document.createElement("div"));
	
	if (artists.length > 0) {
		artistDiv.append($(document.createElement("strong")).html("Artist Results"));
		artistDiv.append($(document.createElement("hr")));
		
		var total = Math.min(10, artists.length);
		for (var i = 0; i < total; i++) {
			var aDiv = $(document.createElement("div")).addClass("artist-result");
			var imgDiv = $(document.createElement("div")).addClass("left").addClass("artist-search-image");
			var img = new ui.SPImage(artists[i].portrait.length > 0 ? artists[i].portrait : "sp://import/img/placeholders/64-artist.png");
			imgDiv.append(img.node);
			aDiv.append(imgDiv);
			aDiv.append(artists[i].name.decodeForText());
			aDiv.attr("data-uri", artists[i].uri);
			artistDiv.append(aDiv);
			artistDiv.append($(document.createElement("div")).addClass("clear"));
		}

		artistDiv.find(".artist-result:even").addClass("result-even");
	}
	
	$("#spotify-results").append(artistDiv.css("margin-bottom", 30));
	
	$.each(artistDiv.find(".artist-result"), function(index, value) {
		if ($(value).height() > 17) {
			$(value).find(".artist-search-image").css("margin-top", -7);
		}
	});
	
	$(".artist-result").click(function() {
		console.log($(this));
		startStation("artist", $(this).attr("data-uri"));
	});
}

function processTracks(tracks) {
	var trackDiv = $(document.createElement("div"));
	
	if (tracks.length > 0) {
		trackDiv.append($(document.createElement("strong")).html("Song Results"));
		trackDiv.append($(document.createElement("hr")));
		
		var total = Math.min(10, tracks.length);
		for (var i = 0; i < total; i++) {
			var aDiv = $(document.createElement("div")).addClass("song-result");
			var imgDiv = $(document.createElement("div")).addClass("left").addClass("song-search-image");
			var img = new ui.SPImage(tracks[i].album.cover.length > 0 ? tracks[i].album.cover : "sp://import/img/placeholders/50-album.png");

			imgDiv.append(img.node);
			aDiv.append(imgDiv);
			aDiv.append($(document.createElement("div")).html(tracks[i].name.decodeForText()).addClass("song-search-title"));
			
			var trackArtists = getArtistNameList(tracks[i].artists);
			
			aDiv.append($(document.createElement("div")).html(trackArtists).addClass("song-search-artist"));
			aDiv.attr("data-uri", tracks[i].uri);
			trackDiv.append(aDiv);
			trackDiv.append($(document.createElement("div")).addClass("clear"));

		}
		
		trackDiv.find(".song-result:even").addClass("result-even");
	}
	
	$("#spotify-results").append(trackDiv);
	
	$.each(trackDiv.find(".song-result"), function(index, value) {
		if ($(value).height() > 34) {
			$(value).find(".song-search-image").css("margin-top", -9 + ($(value).height() - 36) / 2);
		}
	});
	
	$(".song-result").click(function() {
		console.log($(this));
		startStation("track", $(this).attr("data-uri"));
	});
}

function setupSearchContainers() {
	var username = sp.core.user.username;
	$("#spotify-results").empty().show();
	
	sp.social.getToplist("artist", "user", username,
		{
			onSuccess: function(results) {
				console.log("SPOTIFY: Found top artists for user " + username, results);
				processArtists(results.artists);
			},
			onComplete: function(_) {
				sp.social.getToplist("track", "user", username,
					{
						onSuccess: function(results) {
							console.log("SPOTIFY: Found top tracks for user " + username, results);
							processTracks(results.tracks);
						}
					});
			}
		});	

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