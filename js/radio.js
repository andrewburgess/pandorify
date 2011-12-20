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
	
	self.getNextTrack = function(params) {
		console.log("PANDORIFY: getNextTrack", params);
		params.session_id = self.sessionId;
		echonest.makeRequest("playlist/dynamic", params, function(data) {
			self.setNextTrack({
				"artist": data.songs[0].artist_name,
				"track": data.songs[0].title,
				"onError": function() {
					self.getNextTrack(params);
				}
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
		console.log(sp.trackPlayer.getPlayingContext());
		
		if (event.data.curtrack == true) {
			if (sp.trackPlayer.getPlayingContext()[0] === self.tempPlaylist.uri) {
				self.getNextTrack({});
				
				var currentIndex = sp.trackPlayer.getPlayingContext()[1];
				if (currentIndex > 0 && self.currentTrack != null) {
						self.playlist.add(self.currentTrack.uri);
				}
				
				self.currentTrack = sp.trackPlayer.getNowPlayingTrack().track;
			}
		}
	};
	
	self.playPlaylist = function(uri) {
		console.log("PANDORIFY: Playing playlist " + uri);
		sp.trackPlayer.playTrackFromContext(uri, 0, "", {
			onSuccess: function() { 
				sp.trackPlayer.setPlayingContextCanSkipPrev(false);
				sp.trackPlayer.setPlayingContextCanSkipNext(true);
			},
			onFailure: function () { },
			onComplete: function () { }
		});
	};
}