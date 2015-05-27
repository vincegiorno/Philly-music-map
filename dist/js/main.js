var mapView=function(){var e={zoom:12,center:new google.maps.LatLng(39.9518,-75.1845),mapTypeId:google.maps.MapTypeId.ROADMAP},t=new google.maps.Map(document.getElementsByClassName("map-canvas")[0],e);return google.maps.event.addDomListener(window,"resize",function(){var e=t.getCenter();google.maps.event.trigger(t,"resize"),t.setCenter(e)}),t},data={};data.venueList=appStorage,data.image="resources/music_marker.png";var view={};view.formatEvents=function(e,t,a,n){var s,r;if(s=n.length&&n[0].Venue.Url?n[0].Venue.Url:t,r='<div class="info"><h3><a href="'+s+'" target="_blank">'+e+"</a></h3>",r+="<h4>"+a+"</h4>",0===n.length)r+="<p>No concert data was available for this venue.</p>";else try{for(var i=0;i<n.length;i++){r+='<h4 class="date">'+view.formatDate(n[i].Date)+"</h4>";for(var o=0;o<n[i].Artists.length;o++)r+="<p>"+n[i].Artists[o].Name+"</p>";r+='<p><a href="'+n[i].TicketUrl+'" target="_blank">Get ticket info</a></p>'}}catch(m){r+="<p>No concert data was available for this venue.</p>"}return r+="</div>"},view.formatDate=function(e){var t=e.substr(5,5),a=parseInt(t.substr(0,2));switch(a){case 1:a="January";break;case 2:a="February";break;case 3:a="March";break;case 4:a="April";break;case 5:a="May";break;case 6:a="June";break;case 7:a="July";break;case 8:a="August";break;case 9:a="September";break;case 10:a="October";break;case 11:a="November";break;case 12:a="December";break;default:a=null}return a+" "+parseInt(t.substr(3,2))};var vm={};vm.searchStr=ko.observable(""),vm.artistSearch=ko.observable(!1),vm.count=0,vm.Venue=function(e){this.id=e.id,this.url=e.url,this.name=e.name,this.address=e.address,this.events=[],this.eventsLoaded=ko.observable(!1),this.loadEvents(),this.contentFormatted=!1,this.marker=new google.maps.Marker({position:{lat:e.latitude,lng:e.longitude},title:this.name,icon:data.image,animation:null,map:vm.map,visible:!1}),view.bound.extend(this.marker.getPosition()),this.infoWindow=new google.maps.InfoWindow({content:""}),google.maps.event.addListener(this.marker,"click",this.showConcerts.bind(this)),google.maps.event.addListener(this.infoWindow,"closeclick",vm.fitMap),this.isVisible=ko.computed(function(){if(!this.eventsLoaded())return!1;if(""===vm.searchStr())return this.marker.setVisible(!0),!0;var e;if(vm.artistSearch()){if(this.events!==[])for(e=this.events.length-1;e>=0;e--)for(var t=this.events[e].Artists.length-1;t>=0;t--)if(this.events[e].Artists[t].Name.toLowerCase().indexOf(vm.searchStr().toLowerCase())>=0)return this.marker.setVisible(!0),!0}else if(this.name.toLowerCase().indexOf(vm.searchStr().toLowerCase())>=0)return this.marker.setVisible(!0),!0;return this.marker.setVisible(!1),!1}.bind(this))},vm.Venue.prototype.toggleMarker=function(){this.marker.setAnimation(null!==this.marker.getAnimation()?null:google.maps.Animation.BOUNCE)},vm.Venue.prototype.loadEvents=function(){if(window.XMLHttpRequest)httpRequest=new XMLHttpRequest;else if(window.ActiveXObject)try{httpRequest=new ActiveXObject("Msxml2.XMLHTTP")}catch(e){try{httpRequest=new ActiveXObject("Microsoft.XMLHTTP")}catch(e){}}httpRequest.onreadystatechange=function(){4===httpRequest.readyState&&(vm.count++,200===httpRequest.status&&(this.events=httpRequest.responseText,this.parseEvents()),vm.count===data.venueList.length&&setTimeout(function(){vm.afterLoad()},1e3))}.bind(this),url="http://api.jambase.com/events?venueId="+this.id+"&page=0&api_key=73ntgrhffzwqdcaan4empnrd",httpRequest.open("GET",url),httpRequest.setRequestHeader("Accept","text/html,application/json"),httpRequest.send()},vm.Venue.prototype.parseEvents=function(){this.events=JSON.parse(this.events).Events,this.eventsLoaded(!0)},vm.Venue.prototype.showConcerts=function(){this.contentFormatted||(this.infoWindow.setContent(view.formatEvents(this.name,this.url,this.address,this.events)),this.contentFormatted=!0),this.infoWindow.open(vm.map,this.marker)},vm.fitMap=function(){vm.map.fitBounds(view.bound)},vm.afterLoad=function(){vm.count>0&&vm.fitMap();for(var e=0,t=vm.venues().length-1;t>=0;t--)vm.venues()[t].eventsLoaded()&&e++;var a=data.venueList.length-e;a>0&&(vm.warning.setContent(a>2?"Sorry, but information for many of the venues could not be downloaded. Please try again later.":"Sorry, but information for some of the venues could not be downloaded. If the information you are looking for does not appear, please try again later."),vm.warning.open(vm.map))};var initialize=function(){try{vm.map=mapView(),view.bound=new google.maps.LatLngBounds}catch(e){return document.getElementsByClassName("google-problem")[0].className="google-problem",!1}vm.warning=new google.maps.InfoWindow({position:vm.map.getCenter()}),vm.venues=ko.observableArray();var t=data.venueList.length;try{if(t>0)var a=setInterval(function(){t--,vm.venues.push(new vm.Venue(data.venueList[t])),0===t&&clearInterval(a)},2e3)}catch(e){vm.warning.setContent("Sorry, but there was a problem loading the app. Please try again later."),vm.warning.open(vm.map)}ko.applyBindings(vm)};