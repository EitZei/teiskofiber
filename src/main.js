import Map from './map';
import {
  calculate
} from './calculate';

const handleCalculation = map => async () => {
  const targetDensity = document.getElementById('targetDensity').value;
  const statusLabel = document.getElementById('status');

  const animate = document.getElementById('animate').checked ? 100 : 0;

  const buildings = await map.getBuildings();
  const startingPoint = await map.getStartingPoint();

  const result = await calculate({
    buildings,
    startingPoint,
    targetDensity,
    animateMs: animate,
    progress: (state) => {
      if (animate) {
        map.drawNetwork(state.edges)
      }

      statusLabel.innerHTML = `${state.remaining} / ${state.total}`;
    }
  });

  statusLabel.innerHTML = ''

  map.drawNetwork(result.edges);

  document.getElementById('propertyCount').value = result.propertyCount;
  document.getElementById('totalLength').value = Math.ceil(result.totalLength);
  document.getElementById('lengthPerProperty').value = Math.ceil(result.lengthPerProperty);
  document.getElementById('actualDensity').value = Math.floor(result.actualDensity);
};

window.onload = () => {
  const map = Map.initMap();

  document.getElementById('calculate').onclick = handleCalculation(map);

  document.getElementById('setStartingPoint').onclick = e => {
    map.setStartingPoint();
  };

  handleCalculation(map)();
};
