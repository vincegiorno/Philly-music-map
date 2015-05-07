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
view.formatEvents = function(name, eventsArray) {
  var contentStr = "<div class='info'><h3><a href='" + eventsArray[0].Venue.Url +
    "' target='_blank'>" + name + "</a></h3>";
  for (var i = 0; i < eventsArray.length; i++) {
    contentStr += "<h4>" + view.formatDate(eventsArray[i].Date) + "</h4>";

    for (var j = 0; j < eventsArray[i].Artists.length; j++) {
      contentStr += "<p>" + eventsArray[i].Artists[j].Name + "</p>";
    }
    contentStr += "<a href='" + eventsArray[i].TicketUrl +
      "' target='_blank'>Get ticket info</a>";
    contentStr += "</div>";
  }
  return contentStr;
};

view.formatDate = function(dateStr) {
  var date = dateStr.substr(5, 5);
  var month = parseInt(date.substr(0, 2));
  switch (month) {
    case 1:
      month = "January";
      break;
    case 2:
      month = "February";
      break;
    case 3:
      month = "March";
      break;
    case 4:
      month = "April";
      break;
    case 5:
      month = "May";
      break;
    case 6:
      month = "June";
      break;
    case 7:
      month = "July";
      break;
    case 8:
      month = "August";
      break;
    case 9:
      month = "September";
      break;
    case 10:
      month = "October";
      break;
    case 11:
      month = "November";
      break;
    case 12:
      month = "December";
      break;
    default:
      month = null;
  }
  return month + " " + parseInt(date.substr(3, 2));
};

var vm = {};
vm.searchStr = ko.observable("");

vm.Venue = function(place) {
  this.id = place.id;
  this.events = [];
  this.eventsLoaded = ko.observable(false);
  this.loadEvents();
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
    map: vm.map,
    visible: false
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
    if (!this.eventsLoaded()) {
      return false;
    }
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
      for (var j = this.events[i].Artists.length - 1; j >= 0; j--) {
        var compare = this.events[i].Artists[j].Name.toLowerCase();
        if (this.events[i].Artists[j].Name.toLowerCase().indexOf(vm.searchStr().toLowerCase()) >= 0) {
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
    if (httpRequest.readyState === 2) {
      console.log("request sent for ", this.name);
    }
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        this.events = JSON.parse(httpRequest.responseText).Events;
        console.log(this.events);
        console.log(this);
        this.eventsLoaded(true);
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

/* Triggered after DOM is loaded to draw map and apply ko bindings,
and to populate the venues array with venue objects. Each new object makes
an API call to JamBase, which limits calls to 2 per second, so
SetInterval is used to time this process. */
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