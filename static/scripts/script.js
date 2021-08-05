const App = {
    data()  {
        return {
            currentPage: 'search',
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
            selectedItem: undefined,
            algorithm: '',
            channelSelect: '',
            indexSelect: '',
            bandOptions: [{band: 'Band 1 (coastal)'}, {band: "Band 2 (blue)"}, {band: "Band 3 (green)"}, {band: "Band 4 (red)"}, {band: "Band 5 (nir)"}, {band: "Band 6 (swir16)"}, {band: "Band 7 (swir22)"},{band: "Band 8 (pan)"}, {band:"Band 9 (cirrus)"}, {band:"Band 10 (lwir)"}, {band:"Band 11 (lwir)"}]
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
        }).addTo(this.map)
        this.update_roi()
        this.map.on('zoom', (e) => { this.update_roi()})
        this.map.on('move', (e) => { this.update_roi()})
    },
    methods: {
        onSelect: function (item) {
            console.log(item)
            this.selectedItem = item
            this.selectedItem.loading = false
            this.selectedItem.loaded = false
            console.log(this.selectedItem)
            this.itemsToProcess.splice(0, this.itemsToProcess.length)
            this.itemsToProcess.push(this.selectedItem)
            this.currentPage = 'process'
        },
        process: async function () {
            var item = this.selectedItem
            item.loading = true
            let options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item)
            }
            var query = ''
            if (this.algorithm == 'getband') {
                url = `/process/${this.algorithm}?band=${this.channelSelect}`
            }
            if (this.algorithm == 'calculateindex') {
                url = `/process/${this.algorithm}?index=${this.indexSelect}`
            }
            console.log("Processing item: ", item.id)
            const f = await fetch(url, options)
            console.log("FETCHED")
            if (f.status == 201) {
                console.log("201 RESULT")
                const res = await f.json()
                this.selectedItem.intervalId = setInterval(async (item, url) => {
                    const fe = await fetch(url)
                    console.log("FETCHED2", fe)
                    const json = await fe.json()
                    if (json["ready"]) {
                        console.log("READY ", json)
                        item.loading = false
                        item.loaded = true
                        item.href = json["href"]
                        this.currentPage = 'result'
                        clearInterval(item.intervalId)
                    }
                }, 3000, item, res["url"]);
                console.log("INTERVAL id", this.selectedItem.intervalId)
            }
            console.log("PROCESS finished", this.items)
        },
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
            this.items.splice(0, this.items.length)
            base_url = "http://127.0.0.1:8000/catalog/search"
            
            url = `${base_url}?lon1=${this.roi.minlon}&lat1=${this.roi.minlat}&lon2=${this.roi.maxlon}&lat2=${this.roi.maxlat}&limit=10&date1=${this.dates.date1}&date2=${this.dates.date2}`
            console.log("search for " + url)
            this.loading = true
            let response = await fetch(url);
            if (response.ok) {
                let json = await response.json();
                this.loading = false
                this.currentPage = 'select'
                this.items = json["items"]
                console.log(json)
                
                this.clear_polygons()
                this.add_polygons()
                
            } else {
                alert("Ошибка HTTP: " + response.status);
                this.loading = false
            }
        },
        clear_polygons() {
            for (var i = 0; i< this.polygons.length; i++) {
                    this.polygons[i].remove()
                }
            this.polygons.splice(0, this.polygons.length)
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
    emits: ['update:modelValue', 'selectevent'],
    methods: {
        confirmSelectItem: function(item) {
            let isSelected = confirm(`Вы уверены, что хотите выбрать снимок ${item.id} для обработки?`);
            if (isSelected) {
                console.log('Selected')
                this.$emit('selectevent', item)
            }
        }
    },
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
        <div class="row">
            <div class="col">
                <div class="row mt-2">
                    <div class="col-6">
                    {{ item.id }}
                    </div>
                    <div class="col-6">
                    {{ item.properties.datetime }}
                    </div>
                </div>
            
                <div class="row mt-2">
                    <div class="col">
                        <img :src="item.assets.thumbnail.href" class="img-fluid">
                    </div>
                </div>
                <div class="row align-items-center">
                    <div class="col">
                        <div class="form-check">
                            <label class="form-check-label">    
                                <input class="form-check-input" type="checkbox" :value="item" v-model="value" @change="checked = !checked">
                                Показать на карте
                            </label>
                        </div>
                    </div>
                    <div class="col">
                        <button class="btn btn-success" @click="confirmSelectItem(item)">Выбрать</button>
                    </div>
                </div>
            </div>
        </div>
    `
})

app.component('process-item', {
    data() {
        return {
            checked: false,
        }
    },
    props: ['item'],
    template: `
        <div class="row">
            <div class="col">
                <div class="row mt-2">
                    <div class="col-6">
                    {{ item.id }}
                    </div>
                    <div class="col-6">
                    {{ item.properties.datetime }}
                    </div>
                </div>
              
                <div class="row mt-2">
                    <div class="col">
                        <img :src="item.assets.thumbnail.href" class="img-fluid">
                    </div>
                </div>
            </div>
        </div>
    `
})


app.component('result-item', {
    data() {
        return {
            checked: false,
        }
    },
    props: ['item'],
    template: `
        <div class="row">
            <div class="col">
                <div class="row mt-2">
                    <div class="col-6">
                    {{ item.id }}
                    </div>
                    <div class="col-6">
                    {{ item.properties.datetime }}
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col">
                        <a :href="item.href" target="_blank"><img :src="item.href" class="img-fluid"></a>
                    </div>
                </div>
            </div>
        </div>
    `
})


app.mount('#app') 


{/* <div :class="{item: true, selected: checked}">
        <div>
            <h5>{{ item.id }}</h5>
            <h5>{{ item.properties.datetime }}</h5>
        </div>
        <div v-if="item.loading" class="loader">
        </div>
        <a v-if="item.loaded" :href="item.href" class="btn" download="">Скачать</a>
        <div>
            <input type="checkbox" :value="item" v-model="value" @change="checked = !checked">
        </div>
        <div class="image">
            <img :src="item.assets.thumbnail.href" class="image">
        </div>
        </div> */}