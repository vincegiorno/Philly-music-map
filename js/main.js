var mapView = function() {

  var mapOptions = {
    zoom: 12,
    center: new google.maps.LatLng(39.9749224, -75.2391609),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  var map = new google.maps.Map(document.getElementsByClassName("map-canvas")[0], mapOptions);

  google.maps.event.addDomListener(window, "resize", function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
  });
};

var image = "resources/music_live.png";

/* Each venue object contains stored data and a marker as its properties */


var vm = {};

vm.searchStr = ko.observable("");

vm.Venue = function(index) {
    self = this;
    self.id = data[index].id;
    self.events = ko.observableArray();
    vm.loadEvents(self.id);
    self.name = data[index].name;
    self.address = data[index].address;
    self.marker = new google.maps.Marker({
      position: {
        lat: data[index].latitude,
        lng: data[index].longitude
      },
      title: self.name,
      icon: data.image,
      animation: null,
      map: null
    });
    google.maps.event.addListener(self.marker, 'click', view.openEventsWindow(self.events));
    self.isVisible = ko.computed(function() {
      if (self.name.indexOf(vm.searchStr) >= 0) {
        return true;
      } else {
        for (var i = self.events.length - 1; i >= 0; i--) {
          if (self.events[i].date.indexOf(vm.searchStr) >= 0) {
            return true;
          }
        }
      } else {
        for (i = self.events.length - 1; i >= 0; i--) {
          for (var j = self.events[i].artists - 1; j >= 0; j--) {
            if (self.events[i].artists[j].indexOf(vm.searchStr) >= 0) {
              return true;
            }
          }
        }
      } else {
        return false;
      }
    });
  };

    vm.venues = ko.observableArray();

    /* Function populates venues with venue objects. it is set up to execute
    twice a second because each */
    vm.initialize = function() {
      var i = data.length - 1;
      venues[i] = new Venue(data[i]);
      venues[i].visible = ko.observable(true);
      vm.getEvents(i, data[i].id);
      i -= 1;
      while (i >= 0) {
        setTimeout(function() {
          venues[i] = vm.createVenue(i);
          i -= 1;
        }, 500);
      }
    }

    vm.getEvents = function(index, id) {
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
      httpRequest.onreadystatechange = processEvents(index);
      url = "http://api.jambase.com/events?venueId=" + id +
        "&page=0&api_key=73ntgrhffzwqdcaan4empnrd";
      httpRequest.open('GET', url);
      httpRequest.send();
    };

    function processEvents(index) {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
          venues[index].events(JSON.parse(httpRequest.responseText));
        } else {
          alert('There was a problem with the request.');
        }
      }
    }

    view.format(data.getEvents(self.id));