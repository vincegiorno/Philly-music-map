var mapView = function() {
  var mapOptions = {
    zoom: 12,
    center: new google.maps.LatLng(39.9518, -75.1845),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  var map = new google.maps.Map(document.getElementsByClassName('map-canvas')[0], mapOptions);
  google.maps.event.addDomListener(window, 'resize', function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, 'resize');
    map.setCenter(center);
  });
  return map;
};

var data = {};
/* The list of venues is being read from a file for now, but alternately could come from
local storage or an API call, when preprocessing would be needed, so data.venuelist is
more of a place saver for now */
data.venueList = appStorage;
data.image = 'resources/music_marker.png';

var view = {};

view.formatEvents = function(name, storedUrl, address, eventsArray) {
  var url, contentStr;
  if (eventsArray.length && eventsArray[0].Venue.Url) {
    url = eventsArray[0].Venue.Url;
  } else {
    url = storedUrl;
  }
  contentStr = '<div class="info"><h3><a href="' + url +
    '" target="_blank">' + name + '</a></h3>';
  contentStr += '<h4>' + address + '</h4>';
  if (eventsArray.length === 0) {
    contentStr += '<p>No concert data was available for this venue.</p>';
  } else {
    try {

      for (var i = 0; i < eventsArray.length; i++) {
        contentStr += '<h4 class="date">' + view.formatDate(eventsArray[i].Date) + '</h4>';

        for (var j = 0; j < eventsArray[i].Artists.length; j++) {
          contentStr += '<p>' + eventsArray[i].Artists[j].Name + '</p>';
        }
        contentStr += '<p><a href="' + eventsArray[i].TicketUrl +
          '" target="_blank">Get ticket info</a></p>';
      }
    } catch (e) {
      contentStr += '<p>No concert data was available for this venue.</p>';
    }
  }
  contentStr += '</div>';
  return contentStr;
};

view.formatDate = function(dateStr) {
  var date = dateStr.substr(5, 5);
  var month = parseInt(date.substr(0, 2));
  switch (month) {
    case 1:
      month = 'January';
      break;
    case 2:
      month = 'February';
      break;
    case 3:
      month = 'March';
      break;
    case 4:
      month = 'April';
      break;
    case 5:
      month = 'May';
      break;
    case 6:
      month = 'June';
      break;
    case 7:
      month = 'July';
      break;
    case 8:
      month = 'August';
      break;
    case 9:
      month = 'September';
      break;
    case 10:
      month = 'October';
      break;
    case 11:
      month = 'November';
      break;
    case 12:
      month = 'December';
      break;
    default:
      month = null;
  }
  return month + ' ' + parseInt(date.substr(3, 2));
};

var vm = {};
vm.searchStr = ko.observable('');
vm.artistSearch = ko.observable(false);
vm.loaded = 0;
vm.failed = 0;

vm.Venue = function(place) {
  this.id = place.id;
  this.url = place.url;
  this.events = [];
  this.eventsLoaded = ko.observable(false);
  this.loadEvents();
  this.name = place.name;
  this.address = place.address;

  this.marker = new google.maps.Marker({
    position: {
      lat: place.latitude,
      lng: place.longitude
    },
    title: this.name,
    icon: data.image,
    animation: null,
    map: vm.map,
    visible: false
  });
  view.bound.extend(this.marker.getPosition());

  this.infoWindow = new google.maps.InfoWindow({
    content: ''
  });
  this.contentFormatted = false;

  google.maps.event.addListener(this.marker, 'click', this.showConcerts.bind(this));
  google.maps.event.addListener(this.infoWindow, 'closeclick', vm.fitMap);

  this.isVisible = ko.computed(function() {
    if (!this.eventsLoaded()) {
      return false;
    }
    // Return true if a venue name, event date or artist name contains the search string
    if (vm.searchStr() === '') {
      this.marker.setVisible(true);
      return true;
    }

    var i;
    if (!vm.artistSearch()) {
      if (this.name.toLowerCase().indexOf(vm.searchStr().toLowerCase()) >= 0) {
        this.marker.setVisible(true);
        return true;
      }
    } else {
      // If events array is empty, skip processing; visible will be set to false by default.
      if (this.events !== []) {
        // Loop through the Arists array for each event
        for (i = this.events.length - 1; i >= 0; i--) {
          for (var j = this.events[i].Artists.length - 1; j >= 0; j--) {
            if (this.events[i].Artists[j].Name.toLowerCase().indexOf(vm.searchStr().toLowerCase()) >= 0) {
              this.marker.setVisible(true);
              return true;
            }
          }
        }
      }
    }
    // Default if no match is found
    this.marker.setVisible(false);
    return false;
  }.bind(this));
};

vm.Venue.prototype.toggleMarker = function() {

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
      httpRequest = new ActiveXObject('Msxml2.XMLHTTP');
    } catch (e) {
      try {
        httpRequest = new ActiveXObject('Microsoft.XMLHTTP');
      } catch (e) {}
    }
  }
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        this.events = httpRequest.responseText;
        this.parseEvents();
        this.eventsLoaded(true);
        vm.loaded++;
      } else {
        vm.failed++;
      }
      if (vm.loaded + vm.failed == data.venueList.length) {
        vm.afterLoad();
      }
    }
  }.bind(this);
  url = 'http://api.jambase.com/events?venueId=' + this.id +
    '&page=0&api_key=73ntgrhffzwqdcaan4empnrd';
  httpRequest.open('GET', url);
  httpRequest.setRequestHeader('Accept', 'text/html,application/json');
  httpRequest.send();
};

vm.Venue.prototype.parseEvents = function() {
  this.events = JSON.parse(this.events).Events;
};

vm.Venue.prototype.showConcerts = function() {
  if (!this.contentFormatted) {
    this.infoWindow.setContent(view.formatEvents(this.name, this.url, this.address, this.events));
    this.contentFormatted = true;
  }
  this.infoWindow.open(vm.map, this.marker);
};

vm.fitMap = function() {
  vm.map.fitBounds(view.bound);
};

vm.afterLoad = function() {
  if (vm.loaded > 0) {
    vm.fitMap();
  }
  if (vm.failed > 0) {
    if (vm.failed > 2) {
      vm.warning.setContent('Sorry, but information for many of the ' +
        'venues could not be downloaded. Please try again later.');

    } else {
      vm.warning.setContent('Sorry, but information for some of the ' +
        'venues could not be downloaded. If the venue you are looking ' +
        'for does not appear, please try again later.');
    }
    vm.warning.open(vm.map);
  }
};

/* Triggered after DOM is loaded to draw map and apply ko bindings,
and to populate the venues array with venue objects. Each new object makes
an API call to JamBase, which limits calls to 2 per second, so
SetInterval is used to time this process. */
var initialize = function() {
  try {
    vm.map = mapView();
    view.bound = new google.maps.LatLngBounds();
  } catch (e) {
    document.getElementsByClassName('google-problem')[0].className = 'google-problem';
    return false;
  }
  vm.warning = new google.maps.InfoWindow({
    position: vm.map.getCenter()
  });
  vm.venues = ko.observableArray();
  try {
    var i = data.venueList.length;
    if (i > 0) {
      var timer = setInterval(function() {
        i--;
        vm.venues.push(new vm.Venue(data.venueList[i]));
        if (i === 0) {
          clearInterval(timer);
        }
      }, 2000);
    }
  } catch (e) {
    vm.warning.setContent('Sorry, but there was a problem oading the app. Please try again later.');
    vm.warning.open(vm.map);
  }
  ko.applyBindings(vm);
};