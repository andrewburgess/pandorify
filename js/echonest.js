function Echonest() = {
	this.key = 'HRKVFLJESXBJLUDBQ';
	this.url = 'http://developer.echonest.com/api/v4/';
}

Echonest.prototype = {
	makeRequest : function(method, args, callback) {
		args.api_key = this.key;
		args.format = 'jsonp';

		console.log("ECHONEST: " + url + method, args);
		$.ajax({
			dataType: 'jsonp',
			cache: false,
			data: args,
			type: 'GET',
			url: this.url + method,
			success: function(data) {
				console.log("ECHONEST: Received data", data);
				if (this.checkResponse(data)) {
					callback(data.response);
				} else {
					console.error("ECHONEST: Bailed");
				}
			},
			error: function(jqxhr, textStatus, errorThrown) {
				console.error("ECHONEST: Problem making request", jqxhr);
				console.error(textStatus);
				console.error(errorThrown);
			}
		});
	},

	checkResponse : function(data) {
		if (data.response) {
			if (data.response.status.code != 0)
				console.error("Error from Echonest: " + data.response.status.message);
			else
				return true;
		}
		else
			console.error("Unexpected response from server");
		return false;
	}
};