// Set up the Google map. Error handling is done in the initialize function that calls mapView
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

// *** The data model is minimal **************************************

var data = {};
/* The list of venues is being read from a file for now, but alternately
could come from local storage or an API call, when preprocessing would be needed */
data.venueList = appStorage;
data.image = 'resources/music_marker.png';


// *** View functions format the API data for use in the infowindows **

var view = {};

/* JSON data retrieved from the API is parsed and stored in each venue's events property.
This function formats the data as an HTML string to be used as the infowindow content string */
view.formatEvents = function(name, storedUrl, address, eventsArray) {
  var url, contentStr;
  // Grab URL from API data if it exists in case it has chenged from file data
  if (eventsArray.length && eventsArray[0].Venue.Url) {
    url = eventsArray[0].Venue.Url;
  } else {
    url = storedUrl;
  }
  /* Begin building the content string with the venue name as a link to its webpage, and
  its address, both of which can be obtained from file data so no need to catch errors */
  contentStr = '<div class="info"><h3><a href="' + url +
    '" target="_blank">' + name + '</a></h3>';
  contentStr += '<h4>' + address + '</h4>';
  // If events property is empty, set message and skip processing loop
  if (eventsArray.length === 0) {
    contentStr += '<p>No concert data was available for this venue.</p>';
  } else {
    // All remaining data will trigger errors if not well-formed, so use try-catch
    try {
      // Each event should have only one date
      for (var i = 0; i < eventsArray.length; i++) {
        contentStr += '<h4 class="date">' + view.formatDate(eventsArray[i].Date) + '</h4>';
        // Each event has an Artists array with one or more artists
        for (var j = 0; j < eventsArray[i].Artists.length; j++) {
          contentStr += '<p>' + eventsArray[i].Artists[j].Name + '</p>';
        }
        // Ticket info provided as a hyperlink
        contentStr += '<p><a href="' + eventsArray[i].TicketUrl +
          '" target="_blank">Get ticket info</a></p>';
      }
      // Default message for infowindow in case of error. Other venues can still go ahead.
    } catch (e) {
      contentStr += '<p>No concert data was available for this venue.</p>';
    }
  }
  // Close HTML string
  contentStr += '</div>';
  return contentStr;
};

//Auxiliary function to format date in reader-friendly form. Errors will be caught in formatEvents
view.formatDate = function(dateStr) {
  // Extract just the date from the UTC timestamp
  var date = dateStr.substr(5, 5);
  // The month is the first 2 digits. Parse as int for convenient use in switch block
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
  // Date is last 2 digits
  return month + ' ' + parseInt(date.substr(3, 2));
};

// *** View Model *****************************************************

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