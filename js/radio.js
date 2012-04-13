function Radio() {
    var self = this;
    
    this.sessionId = "";
    
    this.playlist = new models.Playlist();
    this.playlist.observe(models.EVENT.LOAD, function() {
        console.log("Playlist loaded!");
    });
    this.playerImage = new views.Player();
    this.playerImage.context = this.playlist;
    
    self.playlist.observe(models.EVENT.LOAD, function() {
        console.log("Playlist loaded?!");
    });
    
    this.lookupTrack = true;
    
    //NOTE: Create "Echonest Playlist" of tracks that were actually able to be found
    
    /*self.banArtist = function() {
        player.next();
        self.getNextTrack({"ban": "artist"});
    };
    
    self.banTrack = function() {
        player.next();
        self.getNextTrack({"ban": "song"});
    };*/
    
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
        params.bucket = ['id:spotify-WW', 'tracks'];
        params.limit = 'true';
        params.session_id = '24cd0a24b71c41b8bb060e65c01a3ae9';
        echonest.makeRequest("playlist/dynamic/restart", params, function(data) {
            console.log("ECHONEST: Session ID - " + data.session_id);
            self.sessionId = data.session_id;
            
            player.observe(models.EVENT.CHANGE, self.trackChanged);
            self.getNextTrack({});
        });
    };
    
    self.setNextTrack = function(params) {
        console.log("PANDORIFY: setNextTrack", params);
        
        if (params.tracks) {
            for (var i = 0; i < params.tracks.length; i++) {
                console.log("Adding track: " + params.tracks[i].artist_name + " - " + params.tracks[i].title, params.tracks[i]);
                if (params.tracks[i].tracks) {
                    if (player.track == null || player.track.uri !== params.tracks[i].tracks[0].foreign_id.sp())
                        self.playlist.add(params.tracks[i].tracks[0].foreign_id.sp());
                }
            }
        }
        
        if (!isRadioPlaying()) {
            self.playPlaylist();
        }
        
        if (params.lookahead) {
            for (var i = 0; i < params.lookahead.length; i++) {
                if (params.lookahead[i].tracks) {
                    console.log("Adding track: " + params.lookahead[i].artist_name + " - " + params.lookahead[i].title, params.lookahead[i]);
                    self.playlist.add(params.lookahead[i].tracks[0].foreign_id.sp());
                }
            }
        }
    };
    
    self.getNextTrack = function(params, extra) {
        console.log("PANDORIFY: getNextTrack", params);
        params.session_id = self.sessionId;
        params.lookahead = 1;
        params.results = 1;
        echonest.makeRequest("playlist/dynamic/next", params, function(data) {            
            self.setNextTrack({tracks: data.songs, lookahead: data.lookahead});
            
            //self.getSessionInfo();
        });
    };
    
    self.trackChanged = function(event) {
        if (event.data.curtrack == true) {
            if (self.isCurrentContext()) {                
                if (player.index != 0) {
                    console.log(player.index);
                    self.getNextTrack({});
                }
            }
        }
        
        self.lookupTrack = true;
    };    
    
    self.playPlaylist = function() {
        console.log("PANDORIFY: Playling playlist " + self.playlist.uri);
        
        sp.trackPlayer.setContextCanSkipPrev(self.playlist.uri, false);
        sp.trackPlayer.setContextCanRepeat(self.playlist.uri, false);
        sp.trackPlayer.setContextCanShuffle(self.playlist.uri, false);
        
        player.play(self.playlist.get(0), self.playlist, 0);
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
