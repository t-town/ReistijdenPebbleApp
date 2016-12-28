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

var URLNearest = "http://1-dot-reistijd-tom.appspot.com/knooppunt";
var URLDestinations = "http://1-dot-reistijd-tom.appspot.com/knooppunten";
var URLReistijden = "http://1-dot-reistijd-tom.appspot.com/reistijden";
var blockSize = 30;
var textWidth = 40;
var main = new UI.Window({
  backgroundColor : 'white'
});
var nrElements = Math.floor((main.size().y - blockSize - 13)/blockSize);

var size = main.size();
var tempText = new UI.Text({
	text: "select a destination and starting position",
	color: "black",
	font : "gothic-24-bold",
	position : new Vector2(2,0),
	size: main.size()
});
function findFirstLocation() { continueTOPrompt(null)};

var parameters = {
	to : null,
	from: null,
	fromCurrentLocation : true,
	destinations : getDestinations(),
	ui : [],
	topBar : null,
	bottomBar : null
};

function UIBar(wind, pos, dest, delay) {
	this.wind = wind;
	this.pos = pos; //y
	this.dest = dest;
	this.delay = delay;
	
	this.getDelayColor = function() {
		if(this.delay > 0) {
			return "red"
		} else {
			return "green"
		}
	},
	this.draw = function() {
		this.text = new UI.Text({
			text : dest,
			color: "black",
			textAlign : "left",
			font : "gothic-24-bold",
			position: new Vector2(2,pos+2),
			textOverflow : "fill",
			size: new Vector2(main.size().x-textWidth,blockSize)
		});
		this.text_delay = new UI.Text({
			text : this.delay,
			color: this.getDelayColor(),
			textAlign : "right",
			font : "bitham-30-black",
			position: new Vector2(main.size().x-textWidth-10,pos-5),
			size: new Vector2(textWidth+10,25)
		});
		this.rect = new UI.Rect({
			position: new Vector2(0,pos),
			size: new Vector2(main.size().x, blockSize),
			borderWidth: 1,
			borderColor: 'black',
			backgroundColor: 'white' 
		});
		this.wind.add(this.rect);
		this.wind.add(this.text);
		this.wind.add(this.text_delay);
	},
	this.update = function(dest, delay) {
		this.dest = dest;
		this.delay = delay;
		this.text.text(dest);
		this.text_delay.text(this.delay);
		this.text_delay.color(this.getDelayColor());
	}
	this.destroy = function() {
		this.wind.remove(this.rect);
		this.wind.remove(this.text);
		this.wind.remove(this.text_delay);
	}
}


function getDestinations(){
	console.log("getting destination data");
	ajax({
		url: URLDestinations,
		type: 'json',
		async : true
	},
	function(data) {
		//success
		parameters.destinations = data;
		//console.log("got destinations");
	},
	function(error) {
		console.log(error);
		statusText.text("error getting dest");
		
	});
	
}
main.on('click', 'up', function(e) {
	//change the "TO"
	//get favorites
	var favorites = Settings.data('favorites');
	if(favorites == null) {
		//retrieve destinations
		choiceMenu("to",parameters.destinations);
		
	} else {
		//display favorites
		choiceMenu('to',favorites.concat(parameters.destinations.filter(function(e) {return !containsName(favorites,e)})));	
	}
	
});

function choiceMenu(parameterType, data) {
	var items = [];
	for(var i in data) {
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
main.on('click','select',function(e) {
	if(parameters.fromCurrentLocation == true) {
		findFirstLocation();
	}
	renewMainWindow();
});
main.on('longClick', 'select', function(e) {
	function calcItems() {
		//printFavorites();
		var favorites = Settings.data('favorites');
		if(favorites == null) { //console.log("fav null");
			Settings.data('favorites',[]);favorites = []
		}
		var items = [];
		for(var i in parameters.destinations) {
			if(!containsName(favorites,parameters.destinations[i])) {
				items.push({title: parameters.destinations[i].name});
			} else {
				//console.log("in favorites");
				items.push({title : parameters.destinations[i].name, icon : "images/action_bar_icon_check_black.png"});
			}
		}
		return items;
	}
	
	var favMenu = new UI.Menu({
		sections : [{
			items : calcItems(),
			title : "select favorites",
		}],
		highlightBackgroundColor : "light gray",
		highlightTextColor : "black"
		
	});
	favMenu.on('select', function(e) {
		var favorites = Settings.data('favorites');
		if(!containsName(favorites,parameters.destinations[e.itemIndex])) {
			Settings.data('favorites',Settings.data('favorites').concat(parameters.destinations[e.itemIndex]));
		} else {
			Settings.data('favorites',favorites.filter(function(x) {return parameters.destinations[e.itemIndex].name !== x.name}));
		}
		//e.item.icon("IMAGE_CHECK");
		favMenu.items(0,calcItems());
	});
	favMenu.show();
});

function printFavorites() {
	console.log("beginning print fav");
	var fav = Settings.data('favorites');
	for(i in fav) {
		console.log(fav[i].name);
	}
}

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
function continueTOPrompt() {
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
			
			var data = {x:crd.latitude,y:crd.longitude};
			//console.log("coordinates " + crd.latitude + " - " + crd.longitude);
			ajax({
				url: URLNearest + "?" + encodeData(data),
				type: 'json'
			},
			function(data) {
				//success
				parameters.from = data;
			    if(WindowStack.top() != main){WindowStack.remove(WindowStack.top(), true);} else {
			    	renewMainWindow();
			    }
			},
			function(error) {
				console.log(error);
			});
			
		}, function(e) {
			//failure
			console.log('error getting location');
		}, options);
	} else {
		//present a list
	    WindowStack.remove(WindowStack.top(), true);
		var favorites = Settings.data('favorites');
		if(favorites == null) {
			//retrieve destinations
			choiceMenu("from",parameters.destinations);
		
		} else {
			//display favorites
			choiceMenu('from',favorites.concat(parameters.destinations.filter(function(e){return !containsName(favorites,e)})));
		}		
	}
}
function containsName(array,element) {
	for(i in array) {
		if(array[i].name == element.name) {
			return true;
		}
	}
	return false;
}

main.on('show', function(e) {
	renewMainWindow();
});

function clearWindow() {
	main.each(function(e){
		main.remove(e);
	});
}

function calculateDelay(route) {
	var delay = 0;
	for(i in route) {
		delay += route[i].vertraging;
	}
	return delay;
}

function renewMainWindow() {
	//to and from are set
	if(parameters.to != null && parameters.from != null) {
		main.remove(tempText);
		//getting new to and from matrix.
		ajax({
			url: URLReistijden + "?" + encodeData({nodes : JSON.stringify([parameters.from,parameters.to])}),
			type: 'json'
		},
		function(data) {
			//success
			if(parameters.topBar == null) { parameters.topBar = new UIBar(main,0,"test",0); parameters.topBar.draw()}
			parameters.topBar.update(parameters.to.name,calculateDelay(data));
			if(parameters.bottomBar == null) {
				var pos = blockSize*nrElements + blockSize;
				parameters.bottomBar = new UI.Text({
					text : parameters.from.name,
					size : new Vector2(main.size().x,main.size().y-pos),
					position : new Vector2(2,pos-5),
					font: "gothic-18-bold",
					color : "black",
					textAlign : "center"
				});
				var tempRect = new UI.Rect({
					size : new Vector2(main.size().x,main.size().y-pos),
					position : new Vector2(0,pos),
					borderWidth: 1,
					borderColor: 'black',
					backgroundColor: 'white' 
					
				});
				main.add(tempRect);
				main.add(parameters.bottomBar);
				
			}
			parameters.bottomBar.text(parameters.from.name);
			var startY = parameters.ui.length * blockSize + blockSize;
			//more entries than before
			//console.log("more");
			for(i = parameters.ui.length; i < nrElements && i < data.length; i++, startY += blockSize) {
				//console.log("i : " + i);
				var temp = new UIBar(main, startY, "test", "0");
				temp.draw();
				parameters.ui.push(temp); 
			}
			//fewer entries than before
			//console.log("fewer");
			
			for(i = data.length; i < parameters.ui.length; i++ ) {
				//console.log("i : " + i + " data length" + data.length);
				
				parameters.ui[i].destroy();
			}
			parameters.ui = parameters.ui.slice(0,data.length);
			
			//update	
			//console.log("update");
			
			for (i = 0; i < parameters.ui.length; i++, startY += blockSize) { 
				//console.log("i : " + i);
				
				parameters.ui[i].update(data[i].to.verkeerscentrumName, data[i].vertraging);
			}
			
		},
		function(error) {
			console.log(error);
		});
	} else {
		//console.log("to or from not set");
	}
	
}

main.add(tempText);
findFirstLocation();
main.show();


