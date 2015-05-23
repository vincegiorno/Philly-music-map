# Philly-music-map
Clickable map of Philadelphia music venues that shows upcoming concerts

When the map loads, it will fetch information on upcoming concerts at the venues in its databse. The data is obtained from the JamBase API. The API is very restrictive, however, and only allows 50 calls per day. (They say to just email tham ans they will raise the limit on request, but I sent several emails and received no reply.) As a result, I have limited the number of venues to 7, so the app can run 7 times in 24 hours before hitting the limit and having calls rejected. When this happens, the app will notify you that data could not be obtained. The API additionally limits calls to 2 per second, so the app uses an interval timer to space out the calls. Even then, 1-second intervals caused problems, so the intervals are set at 1.5 seconds. As a result, the loads slowly. Venues appear on the map as data is received and processed.

By checking the appropriate box in the search bar, the artist lists for the concerts at each venue will be searched instead of the venue names. However, I was not able to implement a planned feature that would scroll to the searched-for artist if an infowindow was opened, so you must manually scroll through the concerts to find the artist. Scrolling is awkward in Firefox, but it can be done if you click on the righ-hand side of the infowindow to make the scroll bar appear and then click and drag it.

I went ahead with the app despite the API limitations, because I think it is potentially useful. But a real implementation for a significantly large number of venues would require the concert data to be downloaded once per day into some kind of storage or database that the app would then pull from. Maybe a full-stack project ...
