/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector2 = require('vector2');
var Settings = require('settings');
var ajax = require('ajax');
var WindowStack = require('ui/windowstack');

var URLNearest = "http://1-dot-reistijd-tom.appspot.com/knooppunt"
var URLDestinations = "http://1-dot-reistijd-tom.appspot.com/knooppunten";
var parameters = {
	to : null,
	from: null,
	fromCurrentLocation : true,
	destinations : getDestinations()
};
var main = new UI.Window({
  backgroundColor : 'white'
});

var size = main.size();
//top bar
var rect = new UI.Rect({
  position: new Vector2(0,0),
  size: new Vector2(size.x, 30),
  borderWidth: 1,
  borderColor: 'black',
  backgroundColor: 'white' 
});
var outlook = new UI.Rect({
  position: new Vector2(size.x,0),
  size: new Vector2(10, 30),
  borderWidth: 0,
  backgroundColor: getOutlookColor("stabiel") 
});
main.add(rect);
//main.add(outlook);
var text = new UI.Text({
  text : "St. St. Woluwe",
  color: "black",
  textAlign : "left",
	font : "gothic-18-bold",
  position: new Vector2(2,5),
	textOverflow : "fill",
  size: new Vector2(size.x-40,30)
});
var text_time = new UI.Text({
  text : "20",
  color: "black",
  textAlign : "left",
	font : "gothic-18-bold",
  position: new Vector2(size.x-40,10),
  size: new Vector2(20,30)
});
var text_delay = new UI.Text({
  text : "+10",
  color: "red",
  textAlign : "left",
	font : "gothic-18-bold",
  position: new Vector2(size.x-29,-5),
  size: new Vector2(30,30)
});
main.add(text);
main.add(text_time);
main.add(text_delay);
main.show();


function getOutlookColor(outlook) {
	if(outlook == 'stijgend') {
		return "sunset orange";
	} else if(outlook == 'dalend') {
		return "medium spring green";
	} else {
		return "picton blue";
	}
}

function getDestinations(){
	ajax({
		url: URLDestinations,
		type: 'json',
		async : false
	},
	function(data) {
		//success
		parameters.destinations = data;
	},
	function(error) {
		console.log(error);
	});
	
}
main.on('click', 'up', function(e) {
	//change the "TO"
	//get favorites
	console.log("clicked up: getting favourites");
	var favorites = Settings.data('favoriteTo');
	if(favorites == null) {
		//retrieve destinations
		choiceMenu("to",parameters.destinations);
		
	} else {
		//display favorites
		choiceMenu('to',favorites);
	}
	
});

function choiceMenu(parameterType, data) {
	var items = [];
	for(i in data) {
		items.push({title: data[i].name});
	}
	var menu = new UI.Menu({
		sections: [{items: items, title: "Choose destination"}]
	});
	menu.on('select',function(e) {
		parameters[parameterType] = data[e.itemIndex];
		menu.hide();
	});
	menu.show();
}

main.on('click', 'select', function(e) {
});

function prompt(question, parameterType,continueFunction) {
	var card = new UI.Card({
		action : {
			up : "IMAGE_CHECK",
			down : "IMAGE_DISMISS"
		},
		title: question
	});
	card.on('click', 'up', function(e) {
		parameters[parameterType] = true;
		continueFunction();
	});
	card.on('click','down', function(e) {
		parameters[parameterType] = false;
		continueFunction();
	});
	return card;
}
/*

function success(pos) {
  var crd = pos.coords;
  var card = new UI.Card();
  card.title('A Card');
  card.subtitle('Is a Window');
  card.body(crd.latitude);
  card.show();

}

function error(err) {
  var card = new UI.Card();
  card.title('A Card');
  card.subtitle('Is a Window');
  card.body("mislukt");
  card.show();

}


main.on('click', 'down', function(e) {
navigator.geolocation.getCurrentPosition(success, error, options);
});
*/
function encodeData(data) {
    return Object.keys(data).map(function(key) {
        return [key, data[key]].map(encodeURIComponent).join("=");
    }).join("&");
}   

main.on('click', 'down', function(e) {
	//change the FROM
	var card = prompt("Use current location?",'fromCurrentLocation',continueTOPrompt);
	card.show();
});
function continueTOPrompt(card) {
	//continue
	
	if(parameters.fromCurrentLocation) {
		//determine the current location
		var options = {
		  enableHighAccuracy: true,
		  maximumAge: 1000,
		  timeout: 10000
		};
		navigator.geolocation.getCurrentPosition(
		function(position) {
			//success
		    var crd = position.coords;
			
			var data = {x:crd.longitude,y:crd.latitude};
			console.log("coordinates " + crd.longitude + " - " + crd.latitude);
			ajax({
				url: URLNearest + "?" + encodeData(data),
				type: 'json'
			},
			function(data) {
				//success
				parameters.to = data;
			    WindowStack.remove(WindowStack.top(), true);
			},
			function(error) {
				console.log(error);
			});
			
		}, function(e) {
			//failure
			Console.log('error getting location');
		}, options);
	} else {
		//present a list
	    WindowStack.remove(WindowStack.top(), true);
		var favorites = Settings.data('favoriteFROM');
		if(favorites == null) {
			//retrieve destinations
			choiceMenu("from",parameters.destinations);
		
		} else {
			//display favorites
			choiceMenu('from',favorites);
		}
		
		choiceMenu('from',parameters.destinations);
		
	}
};

main.on('show', function(e) {
	text.text(parameters.to.name);
})
