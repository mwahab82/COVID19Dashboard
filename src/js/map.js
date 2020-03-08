import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import {defaults as defaultControls, FullScreen} from 'ol/control';
import {fromLonLat, transform} from 'ol/proj';
import {Tile as TileLayer} from 'ol/layer';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import VectorSource from 'ol/source/Vector';
import {Fill, Stroke, Style, Text, Image, Circle} from 'ol/style';
import XYZ from 'ol/source/XYZ';
import Overlay from 'ol/Overlay';

import axios from 'axios';
import moment from 'moment';

import { lastStateChartFn, lastOutcomesChartFn } from './chart-stato'
import { regionDistributionChart } from './chart-regioni'
import { casesDiffusionChart } from './chart-cases'

const url = "https://covid19-it-api.herokuapp.com";

// Map
var map = new Map({
    target: 'map',
    controls: defaultControls().extend([
        new FullScreen({tipLabel:'Mappa a schermo intero'})
      ]),
    layers: [
        new TileLayer({
            source: new XYZ({
                attributions:'CoViD-19 Data Source &copy; <a href="http://www.protezionecivile.gov.it/" target="_blank">'+
                             'Sito del Dipartimento della Protezione Civile - Presidenza del Consiglio dei Ministri</a>',
                url: 'http://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
            })
        })
    ],
    view: new View({
      center: fromLonLat([13.245209,42.304227]),
      zoom: 6
    })
});

// Popup overlay
// Popup showing the position the user clicked
var popup = new Overlay({
    element: document.getElementById('popup')
});
map.addOverlay(popup);

// Regions centroids
var centroidsLayer = new VectorImageLayer({
    source: new VectorSource({
        format: new GeoJSON()
    }),
    style: function(feature) {
        const casi = parseInt(feature.get('numero_casi'));
        var radius;
        if(casi >= 1 && casi <= 5){
            radius = 4;
        } else if(casi >= 6 && casi <= 15) {
            radius = 10;
        } else if (casi >= 16 && casi <= 30) {
            radius = 15;
        } else if (casi >= 31 && casi <= 50) {
            radius = 18;
        } else if (casi >= 51 && casi <= 70){
            radius = 22;
        } else if (casi >= 71 && casi <= 100){
            radius = 25;
        } else if (casi >= 101 && casi <= 150){
            radius = 30;
        } else if (casi >= 151 && casi <= 200){
            radius = 35;
        } else if (casi >= 201 && casi <= 250){
            radius = 40;
        } else if (casi >= 251 && casi <= 300){
            radius = 45;
        } else if (casi >= 301 && casi <= 400){
            radius = 50;
        } else if (casi >= 401 && casi <= 500){
            radius = 55;
        } else if (casi >= 501 && casi <= 600){
            radius = 60;
        } else if (casi >= 601 && casi <= 700){
            radius = 65;
        } else {
            radius = 70;
        }

        return new Style({
            image: new Circle({
                radius: radius,
                fill: new Fill({color: 'rgba(220,53,69,.75)' }),
	            stroke: new Stroke({color: '#dc3545', width: 2})
            })
        })
        
    }
});

map.addLayer(centroidsLayer);
centroidsLayer.set("name","Centroidi Regioni");

// Mouse move
// ************************************************************
map.on('pointermove', function(e) {
	if (e.dragging) return;
    var pixel = e.map.getEventPixel(e.originalEvent);
    var hit = e.map.forEachFeatureAtPixel(pixel, function (feature, layer) {
    	if (layer){

            var coordinate = e.coordinate;
            popup.setPosition(coordinate);
            document.getElementById('popup-content').innerHTML = "<h5 class='text-danger'>"+feature.getProperties().regione+"</h5>"
                                                                + "Tamponi: "+feature.getProperties().tamponi
                                                                + "<br/>Totale casi: "+feature.getProperties().numero_casi
                                                                + "<br/>Positivi: "+feature.getProperties().totale_positivi

            return layer.get('name') === 'Centroidi Regioni'/* || layer.get('name') === 'Comuni'*/;
        }
    });
    if (hit){
        e.map.getTargetElement().style.cursor = 'pointer';
    } else {
        popup.setPosition(undefined);
        e.map.getTargetElement().style.cursor = '';
    }
    // e.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});

// Get COVID19 Summary Data
// ************************************************************
axios.get(url+'/summary',{ params:{} }).then(function(response){
    var totale_contagiati = response.data[0].totale;
    var aggiornamento = response.data[0].aggiornamento;
    // Update total count
    document.querySelector("#tot-contagi").innerHTML = totale_contagiati
    // Update date
    document.querySelector("#data-at").innerHTML = moment(aggiornamento).format('DD MMM YYYY, HH:mm')
    // Last Outcomes Chart
    lastOutcomesChartFn(response.data[0])
    // Trend Chart
    casesDiffusionChart(response.data);
    // Populate region distribution layer and chart
    regionDistribution(aggiornamento);
});

// Get COVID19 State Data
// ************************************************************
axios.get(url+'/state',{ params:{} }).then(function(response){
    // LastState Chart
    setTimeout(function(){lastStateChartFn(response.data[0])},250);
});

// Get COVID19 Last Distribution Data
// ************************************************************
const regionDistribution = function(aggiornamento){
    axios.get(url+'/distribution/regions/overview',{
        params:{
            data: moment(aggiornamento).format('YYYY-MM-DD HH:mm:ss')
        }
    }).then(function(response){
        // Spatial data
        var features = response.data.features;
        var reprojected_features = [];
        features.forEach(function(feature){
            var obj;
            // Correzione temporanea da eliminare dopo aver modificato il geocoder sulle API
            if (feature.properties.regione == 'Emilia Romagna') {
                obj = {"type":"Feature","properties":feature.properties, "geometry":{"type":"Point",coordinates:new transform([11.039213647000054,44.52591084900007],'EPSG:4326','EPSG:3857')}}
            // Correzione temporanea da eliminare dopo aver modificato il geocoder sulle API
            } else if (feature.properties.regione == 'Friuli V.G.') {
                obj = {"type":"Feature","properties":feature.properties, "geometry":{"type":"Point",coordinates:new transform([12.5594548,46.1129993],'EPSG:4326','EPSG:3857')}}
            // Correzione temporanea da eliminare dopo aver modificato il geocoder sulle API
            } else if (feature.properties.regione == 'Trento') {
                obj = {"type":"Feature","properties":feature.properties, "geometry":{"type":"Point",coordinates:new transform([10.6469911,46.1015475],'EPSG:4326','EPSG:3857')}}
            // Correzione temporanea da eliminare dopo aver modificato il geocoder sulle API
            } else if (feature.properties.regione == 'Bolzano') {
            // Correzione temporanea da eliminare dopo aver modificato il geocoder sulle API
                obj = {"type":"Feature","properties":feature.properties, "geometry":{"type":"Point",coordinates:new transform([11.37359619140625,46.538082005463075],'EPSG:4326','EPSG:3857')}}
            } else {
                obj = {"type":"Feature","properties":feature.properties, "geometry":{"type":"Point",coordinates:new transform(feature.geometry.coordinates,'EPSG:4326','EPSG:3857')}}
            }
            reprojected_features.push(obj);
        })
        var collection = {"type": "FeatureCollection", "features": reprojected_features};
        var featureCollection = new GeoJSON().readFeatures(collection);
        // Update centroids layer
        centroidsLayer.getSource().addFeatures(featureCollection);
        // Regional Distribution Chart
        regionDistributionChart(features)
    });
}