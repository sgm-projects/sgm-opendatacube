Vue.component('search-item', {
    props: ['item'],
    template: `
        <div class="item">
        
        <h5>{{ item.id }}</h5>
        <h5>{{ item.properties.datetime }}</h5>
            <img :src="item.assets.thumbnail.href" width="350px">
        </div>
    `
})


var app = new Vue({
    el: '#app',
    data: {
        roi: {
            minlat: 0,
            maxlat: 90,
            minlon: 100,
            maxlon: 120
        },
        dates: {
            date1: new Date().toISOString().split('T')[0],
            date2: new Date().toISOString().split('T')[0]
        },
        items: [],
        itemsToProcess: []
    },
    mounted: function () {
        this.map = L.map('mapid').setView([43.079, 131.883], 10)
        L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: 'mapbox/streets-v11',
            crs: L.CRS.EPSG4326,
            tileSize: 512,
            zoomOffset: -1,
            accessToken: 'pk.eyJ1IjoicGlrdmljIiwiYSI6ImNrbmg2OG5obDB4ejMyeG53a2dneWQ3ZjcifQ.sIAGARTv1xvoqlCe0hghGA'
        }).addTo(this.map);
        this.update_roi()
        this.map.on('zoom', (e) => { this.update_roi()})
        this.map.on('move', (e) => { this.update_roi()})
    },
    methods: {
        update_roi: function () {
            let bounds = this.map.getBounds()
            this.roi = {
                minlat: bounds.getSouth().toFixed(6),
                maxlat: bounds.getNorth().toFixed(6),
                minlon: bounds.getWest().toFixed(6),
                maxlon: bounds.getEast().toFixed(6)
            }
        },
        search: async function() {
            base_url = "http://127.0.0.1:8000/catalog/getforregion"
            
            url = `${base_url}?lon1=${this.roi.minlon}&lat1=${this.roi.minlat}&lon2=${this.roi.maxlon}&lat2=${this.roi.maxlat}&limit=10&date1=${this.dates.date1}&date2=${this.dates.date2}`
            console.log("search for " + url)
        
            let response = await fetch(url);
            if (response.ok) {
                let json = await response.json();
                this.items = json["items"]
                console.log(json)
                
                // clear_polygons()
                // add_polygons(json["items"])
            
            } else {
                alert("Ошибка HTTP: " + response.status);
            }
        }

    },
    delimiters: ['[[',']]']
})


  var popup = L.popup();

  var polygons = []
  var result = undefined
  var thumbs = []

  async function onMapClick(e) {
      
      popup
          .setLatLng(e.latlng)
          .setContent("Загрузка последнего снимка для координат " + e.latlng.toString())
          .openOn(mymap);

      console.log(e.latlng)

      url = "http://127.0.0.1:8000/getpathrow?lon=" + e.latlng.lng + "&lat=" + e.latlng.lat

      let response = await fetch(url);
      if (response.ok) {
      
          let json = await response.json();
          console.log(json)
          
          for (var i = 0; i< polygons.length; i++) {
              polygons[i].remove()
          }
          polygons.splice(0, polygons.length)

          for (var i = 0; i< thumbs.length; i++) {
              thumbs[i].remove()
          }
          thumbs.splice(0, thumbs.length)
          
          message = ""
          for (var i = 0; i < json.length; i++) {
              message += "Path: " + json[i]["path"] + " Row: " + json[i]["row"] + "<br>Date: "+ json[i]["datetime"] + "<br>"
              var polygon = L.polygon(json[i]["polygon"]).addTo(mymap);
              polygons.push(polygon)

              var imageUrl = json[i]["thumb"];
              var imageBounds = json[i]["bbox"];
              var image = L.imageOverlay(imageUrl, imageBounds, {"opacity": 0.85}).addTo(mymap);
              thumbs.push(image)
          }
          
          // var url_to_geotiff_file = "https://s3-us-west-2.amazonaws.com/landsat-pds/L8/114/030/LC81140302015011LGN00/LC81140302015011LGN00_B8.TIF";

              
          // parseGeoraster(url_to_geotiff_file).then(georaster => {
          //     console.log("georaster:", georaster);
          //     var layer = new GeoRasterLayer({
          //         attribution: "Planet",
          //         georaster: georaster,
          //         resolution: 128,
          //         pixelValuesToColorFn: values => {
          //             value = Math.round((values[0] / 32767) * 255).toString(16)
          //             return "#" + value + value + value
          //             console.log(value)
          //         }
          //     });
          //     layer.addTo(mymap);

          //     //map.fitBounds(layer.getBounds());

          // });



          popup
              .setLatLng(e.latlng)
              .setContent(message)
              .openOn(mymap);

      } else {
          alert("Ошибка HTTP: " + response.status);
      }
  }

  // mymap.on('click', onMapClick);

  function clear_polygons() {
      for (var i = 0; i< polygons.length; i++) {
              polygons[i].remove()
          }
      polygons.splice(0, polygons.length)
  }

  function add_polygons(items) {
      for (var i = 0; i < items.length; i++) {
          coords = items[i]["geometry"]["coordinates"][0]
          latlngs = []
          for (var j = 0; j < coords.length; j++) {
              latlngs.push([coords[j][1], coords[j][0]])
          }
          console.log(latlngs)
          var polygon = L.polygon(latlngs).addTo(mymap);
          polygons.push(polygon)
      }
  }

  async function get_thumbnail(item, index) {
      console.log("Clicked")
      let options = {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(item)
                  }
      url = "http://127.0.0.1:8000/process/thumbnail?factor=2"
      let response = await fetch(url, options);
      if (response.ok) {
          let json = await response.json();
          var loader = document.getElementById("res" + index)
          var img = document.getElementById("img" + index)
          loader.hidden = true
          src = "http://127.0.0.1:8000/" + json["href"]
          img.innerHTML = '<img src="' + src + '">'
          console.log("THUMB")
          console.log(json)
          var imageUrl = src
          var imageBounds = json["points"];
          var image = L.imageOverlay(imageUrl, imageBounds, {"opacity": 0.95}).addTo(mymap);
      } else {
          alert("Ошибка HTTP: " + response.status);
      }
  }

  
  search_button = document.getElementById("search")
  search_button.onclick = search
