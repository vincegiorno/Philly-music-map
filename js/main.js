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
  // Numerical date is last 2 digits
  return month + ' ' + parseInt(date.substr(3, 2));
};

// *** View Model *****************************************************

var vm = {};
/* 4 app variables are set here: searchStr, which holds the user-input search text;
artistSearch, a boolean that determines whether the search is conducted on the venue or
artist names; and loaded and failed which count successful and unsuccessful API calls */
vm.searchStr = ko.observable('');
vm.artistSearch = ko.observable(false);
vm.loaded = 0;
vm.failed = 0;

/* Constructor for venue objects. Each object holds static file data (including API id),
state variables and data fetched from the API for one of the venues. */
vm.Venue = function(place) {
  this.id = place.id;
  this.url = place.url;
  this.name = place.name;
  this.address = place.address;
  this.events = [];
  this.eventsLoaded = ko.observable(false); // Set to true after successful API call
  this.loadEvents(); // Makes the API call to load concert data for the venue
  /* Markers are created using file geo data. The visible property is initially set to false
  and then set to true after a successful API call */
  this.contentFormatted = false; // Set to true after events data is properly formatted
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
  // Map boundaries are reset to ensure the marker will be in view when it is visible
  view.bound.extend(this.marker.getPosition());
  // Infowindow created but content can be set only after API call
  this.infoWindow = new google.maps.InfoWindow({
    content: ''
  });
  // Set Infowindow to open on marker click
  google.maps.event.addListener(this.marker, 'click', this.showConcerts.bind(this));
  /* Opening Infowindow changes map boundaries, so reset when window closes. This must be
  done by function reference, since a function call will be executed immediately */
  google.maps.event.addListener(this.infoWindow, 'closeclick', vm.fitMap);

  // Several factors determine whether or not a venue is listed and its marker is visible
  this.isVisible = ko.computed(function() {
    // Events data has not been received from the API, so hide venue
    if (!this.eventsLoaded()) {
      return false;
    }
    // All venues/markers show if data is loaded and search string is empty
    if (vm.searchStr() === '') {
      this.marker.setVisible(true);
      return true;
    }
    // If artist search not checked, show venues whose name contains search string
    var i;
    if (!vm.artistSearch()) {
      if (this.name.toLowerCase().indexOf(vm.searchStr().toLowerCase()) >= 0) {
        this.marker.setVisible(true);
        return true;
      }
    } else { // artist search is checked
      // If events array is empty, skip processing; visible will be set to false by default.
      if (this.events !== []) {
        /* Loop through the Arists array for each event. Exit function and show venue
        on first artist's name that contains search string */
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
    // If no match is found, do not list venue or show marker
    this.marker.setVisible(false);
    return false;
  }.bind(this));
};

/* Turn animation on or off. No need to bind context, since the call is set up
inside a ko foreach on an observable array */
vm.Venue.prototype.toggleMarker = function() {
  if (this.marker.getAnimation() !== null) {
    this.marker.setAnimation(null);
  } else {
    this.marker.setAnimation(google.maps.Animation.BOUNCE);
  }
};

// Make and process API calls
vm.Venue.prototype.loadEvents = function() {
  // Mozilla code for browser compatability
  if (window.XMLHttpRequest) { // Mozilla, Safari, ...
    httpRequest = new XMLHttpRequest();
  } else if (window.ActiveXObject) { // IE
    try {
      httpRequest = new ActiveXObject('Msxml2.XMLHTTP');
    } catch (e) {
      try { // Legacy IE
        httpRequest = new ActiveXObject('Microsoft.XMLHTTP');
      } catch (e) {}
    }
  }
  // Set up AJAX callback handler
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        /* Store raw JSON data, because atttempts to parse before storing
        cause some API calls to fail silently */
        this.events = httpRequest.responseText;
        // So let parsing be done via a call to a prototype method
        this.parseEvents();
        // Count successes and failures
        vm.loaded++;
      } else {
        vm.failed++;
      }
      // Call afterLoad method after all API calls have resolved
      if (vm.loaded + vm.failed == data.venueList.length) {
        vm.afterLoad();
      }
    }
  }.bind(this); // Bind callback to instance making the AJAX call
  // Set up AJAX call
  url = 'http://api.jambase.com/events?venueId=' + this.id +
    '&page=0&api_key=73ntgrhffzwqdcaan4empnrd';
  httpRequest.open('GET', url);
  // Firefox by default requests XML response, so ensure JSON request
  httpRequest.setRequestHeader('Accept', 'text/html,application/json');
  httpRequest.send();
};

// Parse returned JSON data so it can be used; set eventsLoaded to show venue & marker
vm.Venue.prototype.parseEvents = function() {
  this.events = JSON.parse(this.events).Events;
  this.eventsLoaded(true);
};

// Callback when Infowindow is opened
vm.Venue.prototype.showConcerts = function() {
  // Format & set Infowindow content the first time it is loaded
  if (!this.contentFormatted) {
    this.infoWindow.setContent(view.formatEvents(this.name, this.url, this.address, this.events));
    this.contentFormatted = true;
  }
  this.infoWindow.open(vm.map, this.marker);
};

// Resize/reorient map so all markers are in view area
vm.fitMap = function() {
  vm.map.fitBounds(view.bound);
};

// Actions performed depending on success/failure of API calls
vm.afterLoad = function() {
  // Only call fitMap if at least one call succeeded or bounds object will be null
  if (vm.loaded > 0) {
    vm.fitMap();
  }
  /* A warning for failed API calls differs for up to or more than 2 failures. The
  Infowindow the warning uses is initialized in the Initialize function. */
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
    // Initialize the map
    vm.map = mapView();
    // Initialize the bounds object after the map has been created
    view.bound = new google.maps.LatLngBounds();
  } catch (e) {
    /* If there is a map error, remove the 'hidden' class on the error message in the
    map div. It will be visible since no map is covering it. */
    document.getElementsByClassName('google-problem')[0].className = 'google-problem';
    return false;
  }
  // Initialize the warning Infowindow only after the map has been successfully created.
  vm.warning = new google.maps.InfoWindow({
    position: vm.map.getCenter()
  });
  // Set up the observable array that holds the Venue objects
  vm.venues = ko.observableArray();
  var i = data.venueList.length;
  try {
    // Functionality allowing a user to add or delete venues could produce a null list
    if (i > 0) {
      /* Creating the first venue object outside the setInterval function was causing a
      malfunction, so I moved it inside, which adds an additional delay but works */
      var timer = setInterval(function() {
        i--;
        // A venue object is created for each venue in the data file and added to the array
        vm.venues.push(new vm.Venue(data.venueList[i]));
        // Cancel the setInterval function after the last venue is created
        if (i === 0) {
          clearInterval(timer);
        }
      }, 2000);
    }
  } catch (e) { // API calls produced errors.
    vm.warning.setContent('Sorry, but there was a problem loading the app. Please try again later.');
    vm.warning.open(vm.map);
  }
  // Bindings must be applied after the DOM is loaded, and initialize() is the onLoad callback.
  ko.applyBindings(vm);
};