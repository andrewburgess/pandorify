function Radio() {
	console.log("PANDORIFY: Creating new radio");
	var self = this;
	
	this.sessionId = "";
	this.currentTrack = null;
	this.radioPlaying = false;
	
	this.playlist = new models.Playlist();
	this.playlist.name = "Pandorify";
	this.tempPlaylist = sp.core.getTemporaryPlaylist("Pandorify Temp " + (new Date()).toISOString());
	this.playlistDisplay = new views.List(this.playlist, function (track) {
		return new views.Track(track, views.Track.FIELD.STAR | views.Track.FIELD.SHARE | 
									   views.Track.FIELD.NAME | views.Track.FIELD.ARTIST | 
									   views.Track.FIELD.DURATION | views.Track.FIELD.ALBUM);
	});
	this.playlistDisplay.node.classList.add("sp-light");
	this.playerImage = new views.Player();
	this.playerImage.context = this.tempPlaylist;
	
	self.createArtistStation = function(artist) {
		if (artist == null) return;
		console.log("PANDORIFY: Starting station with artist " + artist.data.name.decodeForText(), artist);
		
		self.startRadio({"artist": artist.data.name.decodeForText(), "type": "artist-radio"});
	};
	
	self.createTrackStation = function(track) {
		if (track == null) return;
		console.log("PANDORIFY: Starting station with song " + track.data.artists[0].name.decodeForText() + " - " + track.data.name.decodeForText(), track);
		
		self.clearPlaylist();
	};
	
	self.createDescriptionStation = function(description) {
		if (description.length == 0) return;
		console.log("PANDORIFY: Starting station with description " + description);
		
		self.clearPlaylist();
	};
	
	self.clearPlaylist = function() {
		while (self.playlist.length > 0) {
			self.playlist.remove(0);
		}
		
		while (self.tempPlaylist.length > 0) {
			self.tempPlaylist.remove(0);
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
					self.playPlaylist(self.tempPlaylist.uri);
					self.radioPlaying = true;
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
					self.tempPlaylist.add(result.tracks[0].uri);
					
					if (isFunction(params.onSuccess)) {
						params.onSuccess();
					}
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
	
	self.trackChanged = function(event) {
		console.log("SPOTIFY: playerStateChanged", event);
		
		if (event.data.curtrack == true) {
			if (sp.trackPlayer.getPlayingContext()[0] === self.tempPlaylist.uri) {
				self.playerImage.playing = sp.trackPlayer.getIsPlaying();
				self.getNextTrack({});
				
				var currentIndex = sp.trackPlayer.getPlayingContext()[1];
				if (currentIndex > 0 && self.currentTrack != null) {
						self.playlist.add(self.currentTrack.uri);
				}
				
				self.currentTrack = sp.trackPlayer.getNowPlayingTrack().track;
			}
			else if (sp.trackPlayer.getIsPlaying() == false) {
				self.getNextTrack({}, self.playPlaylist);
			}
		}
	};
	
	self.playPlaylist = function() {
		console.log("PANDORIFY: Playing playlist " + self.tempPlaylist.uri);
		var index = self.radioPlaying ? self.tempPlaylist.length - 1 : 0;
		sp.trackPlayer.playTrackFromContext(self.tempPlaylist.uri, index, "", {
			onSuccess: function() { 
				sp.trackPlayer.setPlayingContextCanSkipPrev(self.tempPlaylist.uri, false);
				sp.trackPlayer.setPlayingContextCanSkipNext(self.tempPlaylist.uritrue);
			},
			onFailure: function () { },
			onComplete: function () { }
		});
	};
}