const App = {
    data()  {
        return {
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
            loading: false,
            itemsToProcess: [],
            polygons: [],
            algorithm: ''
        }
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
        process() {
            for (var i = 0; i < this.items.length; i++) {
                this.items[i].loading = true
            }
        },
        // process: async function() {
        //     let options = {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json'
        //         },
        //         body: JSON.stringify(this.itemsToProcess)
        //     }
        //     url = `/process?algorithm=${this.algorithm}`
        //     let response = await fetch(url, options);
        //     if (response.ok) {
        //         let json = await response.json();
        //     } else {
        //         alert("Ошибка HTTP: " + response.status);
        //     }
        // },
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
            this.loading = true
            let response = await fetch(url);
            if (response.ok) {
                let json = await response.json();
                this.loading = false
                this.items = json["items"]
                console.log(json)
                
                this.clear_polygons()
                this.add_polygons()
            
            } else {
                alert("Ошибка HTTP: " + response.status);
            }
        },
        clear_polygons() {
            for (var i = 0; i< this.polygons.length; i++) {
                    this.polygons[i].remove()
                }
            this.polygons.splice(0, polygons.length)
        },
        add_polygons() {
            for (var i = 0; i < this.items.length; i++) {
                coords = this.items[i]["geometry"]["coordinates"][0]
                latlngs = []
                for (var j = 0; j < coords.length; j++) {
                    latlngs.push([coords[j][1], coords[j][0]])
                }
                var polygon = L.polygon(latlngs)
                polygon.addTo(this.map)
                polygon.id = this.items[i].id
                this.polygons.push(polygon)
            }
        },
        update_polygons() {
            for (var i = 0; i < this.polygons.length; i++) {
                this.polygons[i].setStyle({color: '#3388ff'})
                for (var j = 0; j < this.itemsToProcess.length; j++) {
                    console.log(this.polygons[i].id, this.itemsToProcess[j].id)
                    if (this.polygons[i].id == this.itemsToProcess[j].id) {
                        this.polygons[i].setStyle({color: "#ff3333"})
                        break
                    }
                }
            }
        }
    },
    watch: {
        itemsToProcess(newItems, oldItems) {
            this.update_polygons()
        }
    },
    delimiters: ['[[',']]']
  }
  
const app = Vue.createApp(App)

app.component('search-item', {
    data() {
        return {
            checked: false,
        }
    },
    props: ['item', 'modelValue'],
    emits: ['update:modelValue'],
    computed: {
        value: {
          get() {
            return this.modelValue
          },
          set(value) {
            this.$emit('update:modelValue', value)
          }
        }
    },
    template: `
        <div :class="{item: true, selected: checked}">
        <div>
            <h5>{{ item.id }}</h5>
            <h5>{{ item.properties.datetime }}</h5>
        </div>
        <div v-if="item.loading" class="loader">
        </div>
        <div>
            <input type="checkbox" :value="item" v-model="value" @change="checked = !checked">
        </div>
        <div class="image">
            <img :src="item.assets.thumbnail.href" class="image">
        </div>
        </div>
    `
})

app.mount('#app')

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
