var views = sp.require("sp://import/scripts/api/views");
var models = sp.require("sp://import/scripts/api/models");
var ui = sp.require("sp://import/scripts/ui");

var player = models.player;
var library = models.library;
var application = models.application;

var el = {
	document: $(document),
	page: $("#page"),
	createStation: $("#create-station"),
	searchInput: $("#radio-search"),
	searchResults: $("#result-area"),
	spotifyResults: $("#spotify-results"),
	descriptionResults: $("#description-results"),
	sessionInfoButton: $("#session-info-button"),
	radio: $("#radio"),
	radioDescription: $("#radio-description"),
	currentlyPlaying: $("#current-playing"),
	banArtist: $("#ban-artist"),
	banTrack: $("#ban-track"),
	artistImage: $("#artist-image"),
	trackName: $("#track-name"),
	artistName: $("#artist-name"),
	playHistory: $("#playHistory"),
	sessionDialog: $("#session-info"),
	sessionTerms: $("#session-terms"),
	radioTitle: $("#radio").find("h2").find("span")
};

//Note: use $.extend({defaults}, passedIn) for parameterized functions

function Pandorify() {
	console.log("PANDORIFY: Creating new Pandorify object");
	
	var self = this;
	this.styles = new Array();
	this.moods = new Array();
	this.savedStations = new Array();
	this.radio = new Radio();
	
	// Gets the application to an initial state where good stuff can happen
	this.initialize = function() {
		el.radio.hide();
	
		el.searchInput.val("");
		el.searchInput.keyup(self.autocompleter.keypress);
		
		el.sessionDialog.dialog({autoOpen: false, maxWidth: Math.round(el.document.width() * 0.8), maxHeight: Math.round(el.document.height() * 0.9)});
		el.sessionInfoButton.click(function() { el.sessionDialog.dialog("open"); });
		
		application.observe(models.EVENT.ARGUMENTSCHANGED, self.handleArgsChanged);
		application.observe(models.EVENT.ACTIVATE, self.handleActivate);
		self.loadEchonestTerms();
		self.populateEmptyResults();
		
		if (player.playing && self.radio.isCurrentContext()) {
			window.location = "spotify:app:pandorify:radio";
			self.handleArgsChanged();	//NOTE: Seems I have to manually call this?
			
			self.setCurrentTrackData();
		}
	};
	
	//Spaces out executing a search based on keypresses
	this.autocompleter = {
		interval: 100,
		lastKeypress: null,
		keypress: function() {
			self.autocompleter.lastKeypress = new Date().getTime();
			setTimeout(function() {
				var currentTime = new Date().getTime();
				if (currentTime - self.autocompleter.lastKeypress > self.autocompleter.interval) {
					self.search(el.searchInput.val());
				}
			}, self.autocompleter.interval + 100);
		}
	};
	
	this.handleActivate = function() {
		if (player.playing && self.radio.isCurrentContext()) {
			window.location = "spotify:app:pandorify:radio";
			self.handleArgsChanged();	//NOTE: Seems I have to manually call this?
			
			self.setCurrentTrackData();
		}
	};
	
	this.handleArgsChanged = function() {		
		switch(application.arguments[0]) {
			case "create":
				el.searchInput.val("");
				self.populateEmptyResults();
				
				el.createStation.show();
				el.radio.hide();
				break;
			case "radio":
				el.radio.show();
				el.createStation.hide();
				break;
		}
	};
	
	this.loadEchonestTerms = function() {
		console.log("PANDORIFY: Loading EchoNest terms");
		
		var worker = function(key, params, arr, callback) {
			if (localStorage.getItem(key) == null) {
				echonest.makeRequest("artist/list_terms", params, function(data) {
					for (var i = 0; i < data.terms.length; i++)
						arr.push(data.terms[i].name);
					localStorage.setItem(key, JSON.stringify(arr));
					
					callback(arr);
				});
			}
		};
		
		if (localStorage.getItem("EchoNestStyles")) {
			self.styles = JSON.parse(localStorage.getItem("EchoNestStyles"));
		} else {		
			worker("EchoNestStyles", {"type": "style"}, self.styles, function(arr) {
				console.log(arr);
				$.each(arr, function(index, e) {
					console.log(e);
					self.processDescriptionResult(e);
				});
			});
		}
		if (localStorage.getItem("EchoNestMoods")) {
			self.moods = JSON.parse(localStorage.getItem("EchoNestMoods"));
		} else {
			worker("EchoNestMoods", {"type": "mood"}, self.moods, function(arr) {
				$.each(arr, function(index, e) {
					self.processDescriptionResult(e);
				});
			});
		}
	};
	
	this.processArtistSearch = function(artists) {
		var getArtistResult = function(artist) {
			var outerDiv = $("<div></div>").addClass("artist-result");
			var portrait = getArtistPortrait(artist);
			outerDiv.append($("<div></div>").append(portrait.node).addClass("left").addClass("artist-search-image")).
					 append(artist.name.decodeForText()).
					 attr("data-uri", artist.uri);
			return outerDiv;
		};
		
		var artistDiv = $("<div></div>").append($("<strong></strong>").html("Artist Results")).
										 append($("<hr />"));
		$.each(artists, function(index, artist) {
			if (artist.data)
				artistDiv.append(getArtistResult(artist.data));
			else
				artistDiv.append(getArtistResult(artist));
		});
		
		el.spotifyResults.append(artistDiv);
		artistDiv.find(".artist-result:even").addClass("result-even");
		$.each(artistDiv.find(".artist-result"), function(index, value) {
			if ($(value).height() > 17) {
				$(value).find(".artist-search-image").css("margin-top", -7);
			}
		});
		
		$(".artist-result").click(function() {
			self.startStation("artist", $(this).attr("data-uri"));
		});
	};
	
	this.processTrackSearch = function(tracks) {
		var getTrackResult = function(track) {
			var outerDiv = $("<div></div>").addClass("song-result");
			var art = getAlbumArt(track);
			outerDiv.append($("<div></div>").append(art.node).addClass("left").addClass("song-search-image")).
					 append($("<div></div>").html(track.name.decodeForText()).addClass("song-search-title")).
					 append($("<div></div>").html(getArtistNameList(track.artists)).addClass("song-search-artist")).
					 attr("data-uri", track.uri);
			return outerDiv;
		};
		
		var trackDiv = $("<div></div>").append($("<strong></strong>").html("Track Results")).
										append($("<hr />"));
		$.each(tracks, function(index, track) {
			if (track.data)
				trackDiv.append(getTrackResult(track.data));
			else
				trackDiv.append(getTrackResult(track));
		});
		
		el.spotifyResults.append(trackDiv);
		trackDiv.find(".song-result:even").addClass("result-even");
		$.each(trackDiv.find(".song-result"), function(index, value) {
			if ($(value).height() > 34) {
				$(value).find(".song-search-image").css("margin-top", -9 + ($(value).height() - 36) / 2);
			}
		});
		
		$(".song-result").click(function() {
			self.startStation("track", $(this).attr("data-uri"));
		});
	};
	
	this.processDescriptionResult = function(desc) {
		el.descriptionResults.append("<div class='description-result'>" + desc + "</div>");
	};
	
	this.search = function(query) {			
		if (query.length == 0) {
			self.populateEmptyResults();
			return;
		}
	
		var search = new models.Search(query);
		search.localResults = models.LOCALSEARCHRESULTS.APPEND;
		search.pageSize = 10;
		search.searchAlbums = false;
		search.searchPlaylists = false;
		
		search.observe(models.EVENT.CHANGE, function() {
			el.spotifyResults.empty();
			if (search.artists.length) {
				self.processArtistSearch(search.artists);
			}
			
			if (search.tracks.length) {
				self.processTrackSearch(search.tracks);
			}			
		});
		search.appendNext();
		
		el.descriptionResults.empty();
		for (var x in self.styles) {
			if (self.styles[x].startsWith(query)) {
				self.processDescriptionResult(self.styles[x]);
			}
		}
		for (var x in self.moods) {
			if (self.moods[x].startsWith(query)) {
				self.processDescriptionResult(self.moods[x]);
			}
		}
		
		$(".description-result").click(function() {
			self.startStation("description", $(this).text());
		});
	};
	
	this.populateEmptyResults = function() {
		var username = sp.core.user.username;
		
		el.spotifyResults.empty();
		
		sp.social.getToplist("artist", "user", username, {
			onSuccess: function(results) {
				self.processArtistSearch(results.artists);
			}
		});
		
		sp.social.getToplist("track", "user", username, {
			onSuccess: function(results) {
				self.processTrackSearch(results.tracks);
			}
		});
		
		el.descriptionResults.empty();
		$.each(self.styles, function(index, style) {
			self.processDescriptionResult(style);
		});
		$.each(self.moods, function(index, mood) {
			self.processDescriptionResult(mood);
		});
		
		$(".description-result").click(function() {
			self.startStation("description", $(this).text());
		});
	};
	
	this.startStation = function(type, uri) {
		switch(type) {
			case "description":
				self.radio.createDescriptionStation(uri);
				el.radio.find("h2").find("span").empty().html("based on " + uri);
				break;
			case "artist":
				models.Artist.fromURI(uri, function(artist) {
					self.radio.createArtistStation(artist);
					el.radioTitle.empty().append("based on ").append(getLinkedArtist(artist));
				});
				break;
			case "track":
				models.Track.fromURI(uri, function(track) {
					self.radio.createTrackStation(track);
					
					el.radioTitle.empty().append("based on ").append(getLinkedTrack(track)).append(" by ");
					getArtistNameLinkList(el.radioTitle, track.artists);
				});
				break;
		}

		window.location = "spotify:app:pandorify:radio";
		self.handleArgsChanged();	//NOTE: Seems I have to manually call this?
		player.observe(models.EVENT.CHANGE, self.trackChanged);
	};
	
	this.trackChanged = function(event) {
		if (self.radio.isCurrentContext() && event.data.curtrack) {
			self.setCurrentTrackData();
		}
	};
	
	this.setCurrentTrackData = function() {
		var track = player.track.data;
			
		$(self.radio.playerImage.image).empty();
		$(self.radio.playerImage.image).append(getAlbumArt(track).node);
		el.artistImage.empty().append(self.radio.playerImage.node);
		
		el.trackName.empty().append(getLinkedTrack(track));
		getArtistNameLinkList(el.artistName.empty(), track.artists);
	};
};

