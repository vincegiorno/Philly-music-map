
var mapView = function() {

var mapOptions = {
    zoom: 12,
    center: new google.maps.LatLng(39.9749224,-75.2391609),
    mapTypeId: google.maps.MapTypeId.ROADMAP
};

var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

// this is our gem
google.maps.event.addDomListener(window, "resize", function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
});
}
