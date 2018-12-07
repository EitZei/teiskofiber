import Map from './map';

import Calculator from './calculate.worker.js';

const transformBuildings = features => {
  let buildingId = 0;
  return features.map(feature => ({
    id: buildingId++,
    noApartments: feature.getProperties()['HUONEISTOJA_KPL'] || 1,
    coordinates: feature.getGeometry().getFirstCoordinate()
  }))
};

const handleCalculation = map => async () => {
  const targetDensity = document.getElementById('targetDensity').value;
  const targetNoApartments = document.getElementById('targetNoApartments').value;
  const maxLineLength = document.getElementById('maxLineLength').value;

  const statusLabel = document.getElementById('status');

  statusLabel.innerHTML = "Ladataan rakennuksia...";

  const buildings = await map.getBuildings();

  const calculator = new Calculator();

  statusLabel.innerHTML = "Lasketaan...";

  calculator.postMessage({
    buildings: transformBuildings(buildings),
    targetDensity,
    targetNoApartments,
    maxLineLength
  });

  calculator.onmessage = (event) => {
    if (event.data.status === 'progress') {
      statusLabel.innerHTML = `${event.data.remaining} / ${event.data.total}`;
    } else {
      statusLabel.innerHTML = ''
      map.drawNetwork(event.data.trees);
      calculator.terminate();
    }
  };
};

window.onload = () => {
  const map = Map.initMap();

  document.getElementById('calculate').onclick = handleCalculation(map);

  handleCalculation(map)();
};
