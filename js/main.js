var mapView = function() {
  var mapOptions = {
    zoom: 12,
    center: new google.maps.LatLng(39.9518, -75.1845),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  var map = new google.maps.Map(document.getElementsByClassName("map-canvas")[0], mapOptions);
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
view.formatEvents = function(name, eventsObj) {
  var contentStr = "<div class='info'><h2>" + name + "</h2>";
  contentStr += "</div>";
  return contentStr;
};

var vm = {};
vm.searchStr = ko.observable("");


vm.Venue = function(place) {
  this.id = place.id;
  this.events = ko.observableArray(testEvents);
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

  this.infoWindow = new google.maps.InfoWindow({
    content: ""
  });
  this.contentFormatted = false;

  google.maps.event.addListener(this.marker, 'click', function() {
    if (!this.contentFormatted) {
      this.infoWindow.setContent(view.formatEvents(this.name, this.events));
      this.contentFormatted = true;
    }
    this.infoWindow.open(vm.map, this.marker);
  }.bind(this));

  this.isVisible = ko.computed(function() {
    // Return true if a venue name, event date or artist name contains the search string
    if (vm.searchStr() === "") {
      this.marker.setVisible(true);
      return true;
    }
    var i;
    if (this.name.toLowerCase().indexOf(vm.searchStr().toLowerCase()) >= 0) {
      this.marker.setVisible(true);
      return true;
    }
    for (i = this.events().length - 1; i >= 0; i--) {
      for (var j = this.events()[i].Artists.length - 1; j >= 0; j--) {
        var compare = this.events()[i].Artists[j].Name.toLowerCase();
        if (this.events()[i].Artists[j].Name.toLowerCase().indexOf(vm.searchStr().toLowerCase()) >= 0) {
          this.marker.setVisible(true);
          return true;
        }
      }
    }
    this.marker.setVisible(false);
    return false;
  }.bind(this));
};

vm.Venue.prototype.toggleBounce = function() {

  if (this.marker.getAnimation() !== null) {
    this.marker.setAnimation(null);
  } else {
    this.marker.setAnimation(google.maps.Animation.BOUNCE);
  }
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


/* Function populates venues with venue objects. it is set up to execute
twice a second because each */
var initialize = function() {
  vm.map = mapView();
  vm.venues = ko.observableArray();
  var i = data.venueList.length - 1;
  vm.venues.push(new vm.Venue(data.venueList[i]));
  var timer = setInterval(function() {
    i--;
    vm.venues.push(new vm.Venue(data.venueList[i]));
    if (i === 0) {
      clearInterval(timer);
    }

  }, 500);
  ko.applyBindings(vm);

};