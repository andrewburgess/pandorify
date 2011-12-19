function Radio() {
	console.log("PANDORIFY: Creating new radio");
	var self = this;
	
	this.sessionId = "";
	this.currentSong = null;
	this.nextSong = null;
	
	this.playlist = new models.Playlist();
	this.playlist.name = "Pandorify";
	this.playlistDisplay = new views.List(this.playlist, function (track) {
		return new views.Track(track, views.Track.FIELD.STAR | views.Track.FIELD.SHARE | 
									   views.Track.FIELD.NAME | views.Track.FIELD.ARTIST | 
									   views.Track.FIELD.DURATION | views.Track.FIELD.ALBUM);
	});
	
	self.createArtistStation = function(artist) {
		if (artist == null) return;
		console.log("PANDORIFY: Starting station with artist " + artist.data.name.decodeForText(), artist);
		
		self.clearPlaylist();
		self.getFirstTrack({"artist": artist.data.name.decodeForText(), "type": "artist-radio"});
		echonest.makeRequest("playlist/dynamic", {"artist": artist.data.name.decodeForText(), "type": "artist-radio"}, function(data) {
			sessionId = data.session_id;
		});
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
	}
	
	//self.getFirstTrack
}