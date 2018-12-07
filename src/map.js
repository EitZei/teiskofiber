import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import {
  Select,
  defaults as DefaultInteractions
} from 'ol/interaction';
import {
  defaults as DefaultControls
} from 'ol/control';
import {
  Polygon,
  LineString
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
  Cluster,
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
import {
  convexHull
} from './geo-utils';

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
    'cluster': new Style({
      image: new Circle({
        fill: new Fill({
          color: 'rgb(255,0,0)'
        }),
        radius: 8,
        stroke: new Stroke({
          color: '#000000',
          width: 1
        }),
      }),
      text: new Text({
        font: '1vh Calibri,sans-serif',
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

const boundingStyle = new Style({
  stroke: new Stroke({
    color: 'rgb(255, 255, 0)',
    width: 1
  }),
  fill: new Fill({
    color: 'rgba(255, 255, 0, 0.2)'
  })
});

let buildingsPromiseResolve = null;
const buildings = new Promise((resolve) => buildingsPromiseResolve = resolve);

const fetchBuildings = () => {
  const INTERESTING_TYPES = ['041', '011', '021', '012', '039', '032', '013'];

  const filters = INTERESTING_TYPES.map(type => equalTo('KAYTTOTARKOITUS', type));

  // generate a GetFeature request
  const featureRequest = new WFS().writeGetFeature({
    srsName: srs,
    featurePrefix: 'opendata',
    featureTypes: ['RAKENNUKSET_MVIEW'],
    outputFormat: 'application/json',
    geometryName: 'GEOLOC',
    bbox: bounds,
    filter: or.apply(null, filters)
  });

  // then post the request and add the received features to a layer
  fetch(geoserverUrl, {
      method: 'POST',
      mode: 'cors',
      body: new XMLSerializer().serializeToString(featureRequest)
    })
    .then(response => response.json())
    .then(json => {
      const features = new GeoJSON().readFeatures(json);
      buildingVectorSource.clear();
      buildingVectorSource.addFeatures(features);

      return features;
    })
    .then(buildingsPromiseResolve);
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
    const type = feature.get('features')[0].getProperties()['KAYTTOTARKOITUS'];
    const noApartments = feature.get('features')[0].getProperties()['HUONEISTOJA_KPL'] || 1;

    const specificStyle = buildingStyle[feature.get('features')[0].getGeometry().getType()][type];
    const style = specificStyle || buildingStyle[feature.get('features')[0].getGeometry().getType()].default;
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

const buildingClusterSource = new Cluster({
  source: buildingVectorSource,
  distance: 20
});

const buildingVectorLayer = new VectorLayer({
  source: buildingClusterSource,
  style: (feature) => {
    const size = feature.get('features').length;

    if (size === 1) {
      const specificStyle = buildingStyle[feature.get('features')[0].getGeometry().getType()][feature.get('features')[0].getProperties()[
        'KAYTTOTARKOITUS']];
      return specificStyle || buildingStyle[feature.get('features')[0].getGeometry().getType()].default;
    } else {
      const style = buildingStyle[feature.getGeometry().getType()].cluster;
      style.getText().setText(size.toString());
      return style;
    }
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
    //const length = Math.ceil(feature.getGeometry().getLength());
    //networkStyle.getText().setText(`${length} m`);

    return networkStyle;
  }
});

const boundingVectorSource = new VectorSource();
const boundingVectorLayer = new VectorLayer({
  source: boundingVectorSource,
  style: boundingStyle,
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
  var controls = DefaultControls({
    rotate: false
  });
  var interactions = DefaultInteractions({
    altShiftDragRotate: false,
    pinchRotate: false
  });

  const map = new Map({
    target: 'map',
    layers: [
      mapLayer,
      boundingVectorLayer,
      networkVectorLayer,
      buildingVectorLayer,
      addressVectorLayer
    ],
    view: new View({
      center: center,
      zoom: 12,
      projection
    }),
    projection,
    maxBounds: bounds,
    controls,
    interactions
  });

  map.on("moveend", fetchAddresses);
  map.on("moveend", event => {
    const clusterDistance = (map.getView().getZoom() < 12) ? 20 : 0;

    buildingClusterSource.setDistance(clusterDistance);
  })

  const select = new Select({
    condition: pointerMove,
    layers: [buildingVectorLayer]
  });
  map.addInteraction(select);
  select.on('select', featureSelected);

  map.once('postrender', () => fetchBuildings());

  return {
    map,
    getBuildings: () => buildings,
    drawNetwork: trees => {
      networkVectorSource.clear();
      boundingVectorSource.clear();

      let allEdges = [];
      const polygons = [];

      trees.forEach(tree => {
        allEdges = allEdges.concat(tree.edges);

        const coordinates = tree.buildings.map(building => building.coordinates);
        const boundingCoordinates = convexHull(coordinates);
        const boundingPolygon = new Polygon([boundingCoordinates]);
        polygons.push(new Feature(boundingPolygon));
      });

      const features = allEdges.map(edge => new Feature({
        geometry: new LineString(edge)
      }));

      networkVectorSource.addFeatures(features);
      boundingVectorSource.addFeatures(polygons);
    }
  }
};

export default {
  initMap
}
