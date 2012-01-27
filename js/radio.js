function Radio() {
	var self = this;
	
	this.sessionId = "";
	
	this.playlist = sp.core.getTemporaryPlaylist("Pandorify " + (new Date()).toISOString());
	this.playerImage = new views.Player();
	this.playerImage.context = this.playlist;
	
	this.echonestQueue = null;
	this.echonestPlaylist = null;
	this.echonestIndex = -1;
	
	this.lookupTrack = true;
	
	//NOTE: Create "Echonest Playlist" of tracks that were actually able to be found
	
	self.banArtist = function() {
		self.lookupTrack = false;
		player.next();
		self.getNextTrack({"ban": "artist"});
	};
	
	self.banTrack = function(skip) {
		if (skip) {
			self.lookupTrack = false;
			player.next();
		}
		self.getNextTrack({"ban": "song"});
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
		self.echonestPlaylist = new Array();
		params.lookahead = 5;
		echonest.makeRequest("playlist/dynamic", params, function(data) {
			console.log("ECHONEST: Session ID - " + data.session_id);
			self.lookahead = 2;
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
		console.log("PANDORIFY: setNextTrack", params);
		if (self.echonestQueue.length == 0) {
			if (isFunction(params.onSuccess)) {
				params.onSuccess();
				params.onSuccess = null;
			}
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
			self.echonestPlaylist.push(song);
			if (search.tracks.length > 0) {
				self.playlist.add(search.tracks[0].data.uri);
				song.uri = search.tracks[0].data.uri;
			} else {
				console.log("No results for " + query);
			}
			
			self.setNextTrack(params);
		});
		search.appendNext();
	};
	
	self.getNextTrack = function(params, extra) {
		console.log("PANDORIFY: getNextTrack", params);
		params.session_id = self.sessionId;
		if (!params.lookahead) {
			if (player.index >= self.playlist.length - 5)
				params.lookahead = Math.min(5, (5 - (self.playlist.length - player.index)) + 1);
			else
				params.lookahead = 2;
		}
		echonest.makeRequest("playlist/dynamic", params, function(data) {	
			var ban = false;
			$.each(data.songs, function(index, song) {
				if (index == 0) {
					//Should be the currently playing song
					if (song.id == self.echonestPlaylist[self.echonestIndex].echonestId) {
						if (self.echonestPlaylist[self.echonestIndex].uri)
							console.log("Playing correct song: " + song.artist_name + " - " + song.title);
						else
							ban = true;
					} else {
						console.warn("Mismatched song. Expected: " + song.artist_name + " - " + song.title);
						if (self.echonestPlaylist[self.echonestIndex].uri) {
							//Song exists in spotify, we need to find it
							console.warn("Exists in Spotify, something screwed up");
							for (var i in self.echonestPlaylist) {
								if (self.echonestPlaylist[i].echonestId == song.id) {
									console.log("Resetting index at " + i);
									self.echonestIndex = i;
								}
							}
						} else {
							ban = true;
						}
					}
				} else {
					if (self.echonestIndex + index < self.echonestPlaylist.length && song.id == self.echonestPlaylist[self.echonestIndex + index].echonestId) {
						console.log("Track already present in playlist " + song.artist_name + " - " + song.title);
					} else {
						console.log("Track  didn't exist at " + (self.echonestIndex + index));
						console.log("Storing track to playlist " + song.artist_name + " - " + song.title);
						self.echonestQueue.push({
							artist: song.artist_name,
							title: song.title,
							echonestId: song.id
						});
					}
				}
			});
			
			var current = data.songs[0];
			if (ban) {
				console.log("Ban track " + current.artist_name + " - " + current.title, current);	//This song wasn't found in spotify, and so is not in our queue
				self.echonestIndex++;
				self.banTrack(false);
			}
			
			self.setNextTrack(extra ? extra : {});
			
			//self.getSessionInfo();
		});
	};
	
	self.trackChanged = function(event) {
		if (event.data.curtrack == true) {
			if (self.isCurrentContext()) {
				self.echonestIndex++;
				
				if (player.index != 0 && self.lookupTrack) {
					self.getNextTrack({});
				} else {
					console.log("NOT GETTING IT");
				}
			}
		}
		
		self.lookupTrack = true;
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

