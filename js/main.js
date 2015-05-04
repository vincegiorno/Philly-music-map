var mapView = function() {
  console.log('mapView called');
  var mapOptions = {
    zoom: 12,
    center: new google.maps.LatLng(39.9518, -75.1845),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  var map = new google.maps.Map(document.getElementsByClassName("map-canvas")[0], mapOptions);
  console.log('map created');
  google.maps.event.addDomListener(window, "resize", function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
  });
  return map;
};

var data = {};
/* The list of venues is being read from a file for now, but alternately could come from
local storage or an API call, when preprocessing would be needed, so data.venuelist is
more of a place saver for now */
data.venueList = appStorage;
data.image = "resources/music_live.png";

var view = {};
view.openEventsWindow = function() {

};

var vm = {};
vm.searchStr = ko.observable("something");


vm.Venue = function(place) {
  this.id = place.id;
  this.events = ko.observableArray();
  this.name = place.name;
  this.address = place.address;
  this.marker = new google.maps.Marker({
    position: {
      lat: place.Latitude,
      lng: place.Longitude
    },
    title: this.name,
    icon: data.image,
    animation: null,
    map: vm.map
  });
  google.maps.event.addListener(this.marker, 'click', view.openEventsWindow(this.events));
  /*this.isVisible = ko.computed(function() {
    // Return true if a venue name, event date or artist name contains the search string
    if ((this.events() === []) || (vm.searchStr === "")) {
      return true;
    }
    var i;
    if (this.name.indexOf(vm.searchStr) >= 0) {
      return true;
    }
    for (i = this.events().length - 1; i >= 0; i--) {
      if (this.events()[i].Date.indexOf(vm.searchStr) >= 0) {
        return true;
      }
    }
    for (i = this.events().length - 1; i >= 0; i--) {
      for (var j = this.events()[i].Artists - 1; j >= 0; j--) {
        if (this.events()[i].Artists[j].name.indexOf(vm.searchStr) >= 0) {
          return true;
        }
      }
    }
    return false;
  }.bind(this));*/
};

vm.Venue.prototype.loadEvents = function() {
  if (window.XMLHttpRequest) { // Mozilla, Safari, ...
    httpRequest = new XMLHttpRequest();
  } else if (window.ActiveXObject) { // IE
    try {
      httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
      try {
        httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
      } catch (e) {}
    }
  }
  if (!httpRequest) {
    alert('Data could not be requested from the server.');
    return false;
  }
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        this.events(JSON.parse(httpRequest.responseText));
      } else {
        alert('There was a problem with the request.');
      }
    }
  }.bind(this);
  url = "http://api.jambase.com/events?venueId=" + this.id +
    "&page=0&api_key=73ntgrhffzwqdcaan4empnrd";
  httpRequest.open('GET', url);
  httpRequest.send();
};

vm.venues = ko.observableArray();



/* Function populates venues with venue objects. it is set up to execute
twice a second because each */
var initialize = function() {
  console.log('started');
  vm.map = mapView();
  var i = data.venueList.length - 1;
  vm.venues.push(new vm.Venue(data.venueList[i]));
  var timer = setInterval(function() {
    i--;
    vm.venues.push(new vm.Venue(data.venueList[i]));
    if (i === 0) {
      clearInterval(timer);
    }

  }, 500);
  console.log(vm.venues());
  ko.applyBindings(vm);

};