jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", (($(window).height() - this.outerHeight()) / 2) + $(window).scrollTop() + "px");
    this.css("left", (($(window).width() - this.outerWidth()) / 2) + $(window).scrollLeft() + "px");
    return this;
}

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

function isFunction(obj) {
    return Object.prototype.toString.call(obj) === "[object Function]";
}

function isRadioPlaying() {
	return (sp.trackPlayer.getPlayingContext()[0] === radio.playlist.uri && sp.trackPlayer.getNowPlayingTrack());
}

function getArtistNameList(artists) {
	var a = artists[0].name.decodeForHTML();
	for (var j = 1; j < artists.length; j++) {
		a += ", " + artists[j].name.decodeForText();
	}
	
	return a;
}

function getArtistNameLinkList(div, artists) {
	div.append($(document.createElement("a")).attr("href", artists[0].uri).text(artists[0].name.decodeForText()));
	for (var i = 1; i < artists.length; i++) {
		div.append(", ");
		div.append($(document.createElement("a")).attr("href", artists[i].uri).text(artists[i].name.decodeForText()));
	}
}

var Autocompleter = {
	interval: 100,
	lastKeypress: null,
	interceptKeypress: function() {
		Autocompleter.lastKeypress = new Date().getTime();
		setTimeout(function() {
			var currentTime = new Date().getTime();
			if (currentTime - Autocompleter.lastKeypress > Autocompleter.interval) {
				autocompleteSearch();
			}
		}, Autocompleter.interval + 100);
	}
};