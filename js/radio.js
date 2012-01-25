function Radio() {
	var self = this;
	
	this.sessionId = "";
	
	this.playlist = sp.core.getTemporaryPlaylist("Pandorify");
	this.playerImage = new views.Player();
	this.playerImage.context = this.playlist;
	
	this.echonestQueue = null;
	this.lastEchonestId = "";
	this.echonestPlaylist = new Array();
	
	//NOTE: Create "Echonest Playlist" of tracks that were actually able to be found
	
	self.banArtist = function() {
		//TODO
	};
	
	self.banTrack = function(skip) {
		self.getNextTrack({"ban": "song"}, function() {
			if (skip)
				sp.trackPlayer.skipToNextTrack();
		});
	};
	
	self.clearPlaylist = function() {
		while (self.playlist.length > 0) {
			self.playlist.remove(0);
		}
	};
	
	self.createArtistStation = function(artist) {
		if (artist == null) return;
		console.log("PANDORIFY: Starting station with artist " + artist.data.name.decodeForText(), artist);
		
		self.startRadio({"artist": artist.data.name.decodeForText(), "type": "artist-radio"});
	};
	
	self.createTrackStation = function(track) {
		if (track == null) return;
		console.log("PANDORIFY: Starting station with song " + track.data.artists[0].name.decodeForText() + " - " + track.data.name.decodeForText(), track);
		
		echonest.makeRequest("song/search", {"title": track.data.name.decodeForText(), "artist": track.data.artists[0].name.decodeForText(), "results": 1}, function(data) {
			if (data.songs.length > 0) {
				var id = data.songs[0].id;
				self.startRadio({"song_id": id, "type": "song-radio"});
			}
		});
	};
	
	self.createDescriptionStation = function(description) {
		if (description.length == 0) return;
		console.log("PANDORIFY: Starting station with description " + description);
		self.startRadio({"description": description, "type": "artist-description"});
	};
	
	self.startRadio = function(params) {
		console.log("PANDORIFY: Starting radio", params);
		self.clearPlaylist();
		self.echonestQueue = new Array();
		params.lookahead = 2;
		echonest.makeRequest("playlist/dynamic", params, function(data) {
			console.log("ECHONEST: Session ID - " + data.session_id);
			self.sessionId = data.session_id;
			
			$.each(data.songs, function(index, song) {
				self.echonestQueue.push({
					artist: song.artist_name,
					title: song.title,
					echonestId: song.id,
				});
			});
			
			player.observe(models.EVENT.CHANGE, self.trackChanged);
			self.setNextTrack({onSuccess: self.playPlaylist});
		});
	};
	
	self.setNextTrack = function(params) {
		if (self.echonestQueue.length == 0) {
			return;
		}
		
		var song = self.echonestQueue.splice(0, 1)[0];
		var query = 'artist:"' + song.artist + '" track:"' + song.title + '"';
		var search = new models.Search(query);
		search.pageSize = 1;
		search.searchArtists = false;
		search.searchAlbums = false;
		search.searchPlaylists = false;
		search.observe(models.EVENT.CHANGE, function() {
			if (search.tracks.length > 0) {
				self.playlist.add(search.tracks[0].data.uri);
				song.uri = search.tracks[0].data.uri;
				self.echonestPlaylist.push(song);
				
				if (params && isFunction(params.onSuccess))
					params.onSuccess();
					
				self.setNextTrack();
			} else {
				console.log("No results for " + query);
				if (player.index == self.playlist.length - 1)
					self.getNextTrack({});	//Panic!
			}
		});
		search.appendNext();
	};
	
	self.getNextTrack = function(params) {
		console.log("PANDORIFY: getNextTrack", params);
		params.session_id = self.sessionId;
		params.lookahead = 2;
		echonest.makeRequest("playlist/dynamic", params, function(data) {			
			var next = data.songs[data.songs.length - 1];
			self.echonestQueue.push({
				artist: next.artist_name,
				title: next.title,
				echonestId: next.id,
			});
			
			var current = data.songs[0];
			if (current.id != self.echonestPlaylist[player.index].echonestId) {
				console.log("Ban track " + current.artist_name + " - " + current.title, current);	//This song wasn't found in spotify, and so is not in our queue
				self.banTrack(false);
			}
			
			self.setNextTrack({ onSuccess: function() { if (!player.playing) self.playPlaylist(self.playlist.length - 1); } });
			
			//self.getSessionInfo();
		});
	};
	
	self.trackChanged = function(event) {		
		if (event.data.curtrack == true) {
			if (self.isCurrentContext()) {
				if (player.index != 0)
					self.getNextTrack({});
			}
		}
	};	
	
	self.playPlaylist = function(index) {
		console.log("PANDORIFY: Playling playlist " + self.playlist.uri);
		
		if (index)
			player.play(self.playlist.uri, self.playlist.uri, index);
		else
			player.play(self.playlist.uri, self.playlist.uri, 0);
		/*player.canChangeRepeat = false;
		player.canChangeShuffle = false;
		player.canPlayPrevious = false;
		player.canPlayNext = true;*/
	};
	
	self.getSessionInfo = function() {
		echonest.makeRequest("playlist/session_info", {"session_id": self.sessionId}, function(data) {
			self.processSessionInfo(data);
		});
	};
	
	self.processSessionInfo = function(data) {
		el.sessionTerms.empty();
		$.each(data.terms, function(index, term) {
			var next = $("<div></div>").addClass("session-term");
			var width = Math.round(term.frequency * 100);
			var divAmount = $("<div></div>").addClass("session-amount").css("width", width + "%");
			next.append($("<div></div>").addClass("session-description").text(term.name));
			next.append(divAmount);
			el.sessionTerms.append(next);			
		});
		
		el.sessionDialog.css("max-height", Math.round($(document).height() * 0.9));
	}
	
	self.isCurrentContext = function() {
		return player.context == self.playlist.uri;
	};
}

function Radio2() {
	console.log("PANDORIFY: Creating new radio");
	var self = this;
	
	this.sessionId = "";
	
	this.playlist = sp.core.getTemporaryPlaylist("Pandorify Temp " + (new Date()).toISOString());
	this.playerImage = new views.Player();
	this.playerImage.context = this.playlist;
	
	this.currentTrack = null;
	this.lookingForNext = false;
	
	this.nextOptions = {}
	
	self.banArtist = function() {
		self.getNextTrack({"ban": "artist"}, function() {
			self.currentTrack = null; 
			sp.trackPlayer.skipToNextTrack(); 
		});
	};
	
	self.banTrack = function() {
		self.getNextTrack({"ban": "song"}, function() {
			self.currentTrack = null;
			sp.trackPlayer.skipToNextTrack();
		});
	};
	
	self.createArtistStation = function(artist) {
		if (artist == null) return;
		console.log("PANDORIFY: Starting station with artist " + artist.data.name.decodeForText(), artist);
		
		self.startRadio({"artist": artist.data.name.decodeForText(), "type": "artist-radio"});
	};
	
	self.createTrackStation = function(track) {
		if (track == null) return;
		console.log("PANDORIFY: Starting station with song " + track.data.artists[0].name.decodeForText() + " - " + track.data.name.decodeForText(), track);
		
		echonest.makeRequest("song/search", {"title": track.data.name.decodeForText(), "artist": track.data.artists[0].name.decodeForText(), "results": 1}, function(data) {
			if (data.songs.length > 0) {
				var id = data.songs[0].id;
				self.startRadio({"song_id": id, "type": "song-radio"});
			}
		});
	};
	
	self.createDescriptionStation = function(description) {
		if (description.length == 0) return;
		console.log("PANDORIFY: Starting station with description " + description);
		self.startRadio({"description": description, "type": "artist-description"});
	};
	
	self.clearPlaylist = function() {
		while (self.playlist.length > 0) {
			self.playlist.remove(0);
		}
	};
	
	self.startRadio = function(params) {
		console.log("PANDORIFY: Starting radio", params);
		self.clearPlaylist();
		echonest.makeRequest("playlist/dynamic", params, function(data) {
			console.log("ECHONEST: Session ID - " + data.session_id);
			self.sessionId = data.session_id;
			
			self.setNextTrack({
				"artist": data.songs[0].artist_name,
				"track": data.songs[0].title,
				"onError": function() {
					self.startRadio(params);	//Attempt to try again
				},
				"onSuccess": function() {
					console.log("PLAYING");
					
					sp.trackPlayer.addEventListener("playerStateChanged", self.trackChanged);
					self.playPlaylist(self.playlist.uri);
					
					self.currentTrack = self.playlist.get(0);
					
					setTimeout(self.checkPlayback, 2000);
				}
			});
		});
	};
	
	self.getNextTrack = function(params, onSuccess) {
		console.log("PANDORIFY: getNextTrack", params);
		params.session_id = self.sessionId;
		echonest.makeRequest("playlist/dynamic", params, function(data) {
			self.setNextTrack({
				"artist": data.songs[0].artist_name,
				"track": data.songs[0].title,
				"onError": function() {
					self.getNextTrack(params);
				},
				"onSuccess": onSuccess
			});
		});
	};
	
	self.setNextTrack = function(params) {
		console.log("PANDORIFY: setNextTrack", params);
		sp.core.search(params.artist + " " + params.track, true, true, {
			onSuccess: function(result) {
				console.log("SPOTIFY: Search results for " + params.artist + " " + params.track, result);
				if (result.tracks.length > 0) {
					console.log("SPOTIFY: Setting next track", result.tracks[0]);
					self.playlist.add(result.tracks[0].uri);
					
					if (isFunction(params.onSuccess)) {
						params.onSuccess();
					}
					
					self.getSessionInfo();
				} else {
					console.warn("SPOTIFY: No results found");
					if (isFunction(params.onError)) {
						params.onError();
					}
				}
			},
			onFailure: function() {
				console.error("SPOTIFY: Search failed for " + params.artist + " " + params.track);
				if (isFunction(params.onError))
					params.onError();
			}
		});
	};
	
	self.getSessionInfo = function() {
		echonest.makeRequest("playlist/session_info", {"session_id": self.sessionId}, function(data) {
			self.processSessionInfo(data);
		});
	};
	
	self.processSessionInfo = function(data) {
		el.sessionTerms.empty();
		$.each(data.terms, function(index, term) {
			var next = $("<div></div>").addClass("session-term");
			var width = Math.round(term.frequency * 100);
			var divAmount = $("<div></div>").addClass("session-amount").css("width", width + "%");
			next.append($("<div></div>").addClass("session-description").text(term.name));
			next.append(divAmount);
			el.sessionTerms.append(next);			
		});
		
		el.sessionDialog.css("max-height", Math.round($(document).height() * 0.9));
		el.sessionDialog.css("max-width", Math.round($(document).width() * 0.5));
	};
	
	self.trackChanged = function(event) {
		console.log("SPOTIFY: playerStateChanged", event);
		
		if (event.data.curtrack == true) {
			if (sp.trackPlayer.getPlayingContext()[0] === self.playlist.uri) {
				self.playerImage.playing = sp.trackPlayer.getIsPlaying();
				self.lookingForNext = false;
			}
			else if (sp.trackPlayer.getIsPlaying() == false) {
				self.getNextTrack({}, self.playPlaylist);
			}
		}
	};
	
	self.playPlaylist = function() {
		console.log("PANDORIFY: Playing playlist " + self.playlist.uri);
		
		var index = self.radioPlaying ? self.playlist.length - 1 : 0;
		sp.trackPlayer.playTrackFromContext(self.playlist.uri, index, "", {
			onSuccess: function() { 
				sp.trackPlayer.setPlayingContextCanSkipPrev(self.playlist.uri, false);
				sp.trackPlayer.setPlayingContextCanSkipNext(self.playlist.uri, true);
			},
			onFailure: function () { },
			onComplete: function () { }
		});
	};
	
	self.checkPlayback = function() {
		if (sp.trackPlayer.getPlayingContext()[0] === self.playlist.uri) {
			var track = sp.trackPlayer.getNowPlayingTrack();
			if (track.position >= track.length - 5000 && !self.lookingForNext) {	//5 seconds left in the track, get the next one
				self.lookingForNext = true;
				self.getNextTrack({});
			}
		}
		
		setTimeout(self.checkPlayback, 1000);
	};
	
	
}