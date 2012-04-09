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
	return (player.context && player.context === pandorify.radio.playlist.uri && player.track);
}

function getArtistNameList(artists) {
	var a = artists[0].name.decodeForHTML();
	for (var j = 1; j < artists.length; j++) {
		a += ", " + artists[j].name.decodeForText();
	}
	
	return a;
}

function getArtistNameLinkList(container, artists) {
	container.append($("<a></a>").attr("href", artists[0].uri).text(artists[0].name.decodeForText()));
	for (var i = 1; i < artists.length; i++) {
		container.append(", ");
		container.append("<a></a>").attr("href", artists[i].uri).text(artists[i].name.decodeForText());
	}
	return container;
}

function getLinkedArtist(artist) {
	return $("<a></a>").attr("href", artist.uri).text(artist.name.decodeForText());
}

function getLinkedTrack(track) {
	return $("<a></a>").attr("href", track.uri).text(track.name.decodeForText());
}

function getAlbumArt(track) {
	return new ui.SPImage(track.album.cover.length > 0 ? track.album.cover: "sp://import/img/placeholders/50-album.png");
}

function getArtistPortrait(artist) {
	return new ui.SPImage(artist.portrait.length > 0 ? artist.portrait : "sp://import/img/placeholders/64-artist.png");
}

String.prototype.sp=function() {
    return this.replace('spotify-WW', 'spotify');
}