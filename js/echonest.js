sp = getSpotifyApi(1);

exports.makeRequest = makeRequest;

var echonestKey = "HRKVFLJESXBJLUDBQ";

function makeRequest(method, args, callback) {
	args.api_key = echonestKey;
	args.format = "jsonp";
	
	console.log("ECHONEST: " + "http://developer.echonest.com/api/v4/" + method, args);
	$.ajax({
		dataType: "jsonp",
		cache: false,
		data: args,
		url: "http://developer.echonest.com/api/v4/" + method,
		success: function (data) {
			console.log("ECHONEST: Received data", data);
			if (checkResponse(data)) {
				callback(data.response);
			} else {
				console.error("ECHONEST: makeRequest bailed");
			}
		},
		error: function (jqxhr, textStatus, errorThrown) {
			console.error("ECHONEST: Problem making request", jqxhr); 
			console.error(textStatus);
			console.error(errorThrown);
		}		
	});
}

function checkResponse(data) {
	if (data.response) {
		if (data.response.status.code != 0) {
			console.error("Error from EchoNest: " + data.response.status.message);
		} else {
			return true;
		}
	} else {
		console.error("Unexpected response from server");
	}
	
	return false;
}

