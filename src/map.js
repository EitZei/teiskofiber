import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import {
  Draw,
  Select
} from 'ol/interaction';
import {
  Point
} from 'ol/geom';
import {
  Style,
  Circle,
  Fill,
  Stroke,
  Text
} from 'ol/style'
import {
  Vector as VectorLayer,
  Tile
} from 'ol/layer';
import {
  equalTo,
  or
} from 'ol/format/filter';
import {
  pointerMove
} from 'ol/events';
import Projection from 'ol/proj/Projection';
import {
  Vector as VectorSource,
  TileWMS
} from 'ol/source';
import {
  getIntersection
} from 'ol/extent';
import {
  GeoJSON,
  WFS
} from 'ol/format';
import {
  register
} from 'ol/proj/proj4';
import proj4 from 'proj4';

const srs = "EPSG:3067";
const geoserverUrl = 'http://opendata.navici.com/tampere/ows';

proj4.defs(srs, "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
register(proj4);

const projection = new Projection({
  code: srs,
  extent: [-3669433.90, 4601644.86, 648181.26, 9364104.12]
});

const bounds = [327571, 6825810, 349183.9375, 6860800.0625];
const center = [336141, 6845570];

const TYPE_NAMES = {
  '041': 'Vapaa-ajan asuinrakennukset',
  '011': 'Yhden asunnon talot',
  '021': 'Rivitalot',
  '012': 'Kahden asunnon talot',
  '039': 'Muut asuinkerrostalot',
  '032': 'Luhtitalot',
  '013': 'Muut erilliset pientalot',
};

const buildingStyle = {
  'Point': {
    '041': new Style({
      image: new Circle({
        fill: new Fill({
          color: 'rgb(173, 216, 230)'
        }),
        radius: 5,
        stroke: new Stroke({
          color: '#000000',
          width: 1
        }),
      }),
      text: new Text({
        font: '2vh Calibri,sans-serif',
        fill: new Fill({
          color: 'rgb(255,0,0)',
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 3
        })
      })
    }),
    'default': new Style({
      image: new Circle({
        fill: new Fill({
          color: 'rgb(255,0,0)'
        }),
        radius: 5,
        stroke: new Stroke({
          color: '#000000',
          width: 1
        }),
      }),
      text: new Text({
        font: '2vh Calibri,sans-serif',
        fill: new Fill({
          color: 'rgb(255,0,0)',
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 3
        })
      })
    })
  }
};

const addressStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: '#000'
    }),
    stroke: new Stroke({
      color: '#fff',
      width: 3
    })
  })
});

const networkStyle = new Style({
  stroke: new Stroke({
    color: 'rgb(187, 41, 187)',
    width: 5
  }),
  text: new Text({
    font: '10px Calibri,sans-serif',
    fill: new Fill({
      color: '#000'
    }),
    stroke: new Stroke({
      color: '#fff',
      width: 3
    })
  })
});


const startPointStyle = new Style({
  image: new Circle({
    fill: new Fill({
      color: 'rgb(0,0,255)'
    }),
    radius: 5,
    stroke: new Stroke({
      color: 'rgb(255,255,255)',
      width: 1
    }),
  }),
});

let firstBuildingsPromise = null;
let firstBuildings = new Promise((resolve) => firstBuildingsPromise = resolve);

const fetchBuildings = (event) => {
  const map = event.map;

  const INTERESTING_TYPES = ['041', '011', '021', '012', '039', '032', '013'];

  const filters = INTERESTING_TYPES.map(type => equalTo('KAYTTOTARKOITUS', type));

  // generate a GetFeature request
  const featureRequest = new WFS().writeGetFeature({
    srsName: srs,
    featurePrefix: 'opendata',
    featureTypes: ['RAKENNUKSET_MVIEW'],
    outputFormat: 'application/json',
    geometryName: 'GEOLOC',
    bbox: getIntersection(bounds, map.getView().calculateExtent()),
    filter: or.apply(null, filters)
  });

  // then post the request and add the received features to a layer
  fetch(geoserverUrl, {
    method: 'POST',
    mode: 'cors',
    body: new XMLSerializer().serializeToString(featureRequest)
  }).then(function (response) {
    return response.json();
  }).then(function (json) {
    const features = new GeoJSON().readFeatures(json);
    buildingVectorSource.clear();
    buildingVectorSource.addFeatures(features);

    if (firstBuildingsPromise) {
      firstBuildingsPromise(features);
    }
  });
};

const fetchAddresses = (event) => {
  const map = event.map;

  if (map.getView().getZoom() < 15) {
    addressVectorSource.clear();
    return;
  }

  // generate a GetFeature request
  const featureRequest = new WFS().writeGetFeature({
    srsName: srs,
    featurePrefix: 'opendata',
    featureTypes: ['ONK_NMR_MVIEW'],
    outputFormat: 'application/json',
    geometryName: 'GEOM',
    bbox: getIntersection(bounds, map.getView().calculateExtent())
  });

  // then post the request and add the received features to a layer
  fetch(geoserverUrl, {
    method: 'POST',
    mode: 'cors',
    body: new XMLSerializer().serializeToString(featureRequest)
  }).then(function (response) {
    return response.json();
  }).then(function (json) {
    const features = new GeoJSON().readFeatures(json);
    addressVectorSource.clear();
    addressVectorSource.addFeatures(features);
  });
};

const featureSelected = event => {
  event.selected.forEach(feature => {
    const type = feature.getProperties()['KAYTTOTARKOITUS'];
    const noApartments = feature.getProperties()['HUONEISTOJA_KPL'] || 1;

    const specificStyle = buildingStyle[feature.getGeometry().getType()][type];
    const style = specificStyle || buildingStyle[feature.getGeometry().getType()].default;
    const featureStyle = style.clone()

    const text = `${TYPE_NAMES[type]}: ${noApartments} huoneistoa`;
    featureStyle.getText().setText(text);
    feature.setStyle(featureStyle);
  });

  event.deselected.forEach(feature => {
    feature.setStyle(null);
  });
};

const buildingVectorSource = new VectorSource();
const buildingVectorLayer = new VectorLayer({
  source: buildingVectorSource,
  style: (feature) => {
    const specificStyle = buildingStyle[feature.getGeometry().getType()][feature.getProperties()[
      'KAYTTOTARKOITUS']];
    return specificStyle || buildingStyle[feature.getGeometry().getType()].default;
  }
});

const addressVectorSource = new VectorSource();
const addressVectorLayer = new VectorLayer({
  source: addressVectorSource,
  style: (feature) => {
    const address = `${feature.getProperties()['KADUNNIMI']} ${feature.getProperties()['NUMERO']}`;

    addressStyle.getText().setText(address);

    return addressStyle;
  }
});

const networkVectorSource = new VectorSource();
const networkVectorLayer = new VectorLayer({
  source: networkVectorSource,
  style: (feature) => {
    const length = Math.ceil(feature.getGeometry().getLength());
    networkStyle.getText().setText(`${length} m`);

    return networkStyle;
  }
});

const startPointVectorSource = new VectorSource();
const startPointVectorLayer = new VectorLayer({
  source: startPointVectorSource,
  style: startPointStyle
});

const mapLayer = new Tile({
  extent: bounds,
  source: new TileWMS({
    url: geoserverUrl,
    params: {
      LAYERS: 'opendata:tampere_vkartta_tm35',
      TILED: true,
      CRS: srs,
      STYLES: 'raster'
    },
    projection,
    transition: 0
  })
});

const initMap = () => {
  const map = new Map({
    target: 'map',
    layers: [
      mapLayer,
      networkVectorLayer,
      buildingVectorLayer,
      addressVectorLayer,
      startPointVectorLayer
    ],
    view: new View({
      center: center,
      zoom: 12,
      projection
    }),
    projection,
    maxBounds: bounds,
  });

  map.on("moveend", fetchBuildings);
  map.on("moveend", fetchAddresses);

  const select = new Select({
    condition: pointerMove,
    layers: [buildingVectorLayer]
  });
  map.addInteraction(select);
  select.on('select', featureSelected);

  const draw = new Draw({
    source: startPointVectorSource,
    type: 'Point'
  });
  draw.on('drawend', () => map.removeInteraction(draw))

  startPointVectorSource.addFeatures([new Feature({
    geometry: new Point(center)
  })]);

  return {
    map,
    getBuildings: () => {
      if (firstBuildings) {
        const result = firstBuildings;
        firstBuildings = null;
        return result;
      } else {
        return Promise.resolve(buildingVectorSource.getFeatures());
      }
    },
    drawNetwork: edges => {
      const features = edges.map(edge => new Feature({
        geometry: edge
      }));

      networkVectorSource.clear();
      networkVectorSource.addFeatures(features);
    },
    setStartingPoint: () => {
      startPointVectorSource.clear();
      map.addInteraction(draw);
    },
    getStartingPoint: () => Promise.resolve(startPointVectorSource.getFeatures()[0])
  }
};

export default {
  initMap
}
