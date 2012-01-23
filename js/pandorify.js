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
	sessionTerms: $("#session-terms")
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
		
		self.populateEmptyResults();
		
		self.loadEchonestTerms();
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
	
	this.loadEchonestTerms = function() {
		console.log("PANDORIFY: Loading EchoNest terms");
		
		var worker = function(key, params, arr, callback) {
			if (localStorage.getItem(key) == null) {
				echonest.makeRequest("artist/list_terms", params, function(data) {
					for (var i = 0; i < data.terms.length; i++)
						arr.push(data.terms[i].name);
					localStorage.setItem(key, JSON.stringify(arr));
					
					callback();
				});
			}
		};
		
		worker("EchoNestStyles", {"type": "style"}, self.styles);
		worker("EchoNestMoods", {"type": "mood"}, self.moods);
	};
	
	this.processArtistSearch = function(artists) {
		var getArtistResult = function(artist) {
			var outerDiv = $("<div></div>").addClass("artist-result");
			var imgDiv = $("<div></div>").addClass("left").addClass("artist-search-image");
			var img = new ui.SPImage(artist.portrait.length > 0 ? artist.portrait : "sp://import/img/placeholders/64-artist.png");
			outerDiv.append(imgDiv.append(img.node)).
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
	};
	
	this.processTrackSearch = function(tracks) {
		var getTrackResult = function(track) {
			var outerDiv = $("<div></div>").addClass("song-result");
			var imgDiv = $("<div></div>").addClass("left").addClass("song-search-image");
			var img = new ui.SPImage(track.album.cover.length > 0 ? track.album.cover: "sp://import/img/placeholders/50-album.png");
			outerDiv.append(imgDiv.append(img.node)).
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
		
		//Search description results
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
	};
};

