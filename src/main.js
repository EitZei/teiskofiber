import Map from './map';
import {
  calculate
} from './calculate';

const handleCalculation = map => async () => {
  const targetDensity = document.getElementById('targetDensity').value;
  const targetNoApartments = document.getElementById('targetNoApartments').value;
  const maxLineLength = document.getElementById('maxLineLength').value;

  const statusLabel = document.getElementById('status');

  const buildings = await map.getBuildings();

  const result = await calculate({
    buildings,
    targetDensity,
    targetNoApartments,
    maxLineLength,
    progress: (state) => {
      statusLabel.innerHTML = `${state.remaining} / ${state.total}`;
    }
  });

  statusLabel.innerHTML = ''

  map.drawNetwork(result.trees);
};

window.onload = () => {
  const map = Map.initMap();

  document.getElementById('calculate').onclick = handleCalculation(map);

  handleCalculation(map)();
};
