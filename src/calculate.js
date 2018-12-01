import Heap from './heap';
import {
  LineString
} from 'ol/geom.js';

const transformBuildings = features => features.map(feature => ({
  noApartments: feature.getProperties()['HUONEISTOJA_KPL'] || 1,
  geometry: feature.getGeometry()
}));

const line = (a, b) => new LineString([a.geometry.getFirstCoordinate(), b.geometry.getFirstCoordinate()]);

const distance = (a, b) =>
  line(a, b).getLength();

const weight = distance;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const heapItem = (item, to, weight) => ({
  item,
  to,
  weight
});

export const calculate = async ({
  buildings,
  startingPoint,
  targetDensity,
  progress,
  animateMs,
}) => {
  const startPoint = {
    noApartments: 0,
    geometry: startingPoint.getGeometry()
  };

  const remainingBuildings = transformBuildings(buildings);

  const heapItems = remainingBuildings
    .map(building => heapItem(building, startPoint, weight(startPoint, building)));

  const heap = new Heap((a, b) => a.weight - b.weight);
  heapItems.forEach(item => heap.push(item));

  const edges = [];

  let totalLength = 0;
  let numberOfApartments = 0;

  while (heap.size() > 0) {
    const toBeAdded = heap.pop();

    const edge = line(toBeAdded.to, toBeAdded.item);

    const newTotalLength = totalLength + edge.getLength();
    const newNumberOfApartments = numberOfApartments + toBeAdded.item.noApartments;

    const wouldBeDensity = newNumberOfApartments / (newTotalLength / 1000);

    if (typeof progress === 'function') {
      progress({
        total: buildings.length,
        remaining: heap.size(),
        edges,
      });
    }

    // If we are not achieving the density then just continue
    if (wouldBeDensity < targetDensity) {
      continue
    };

    edges.push(edge);

    totalLength = newTotalLength;
    numberOfApartments = newNumberOfApartments;

    // Rearrange heap
    let changed = false;
    heap.toArray().forEach(itemInHeap => {
      const weightWithToBeAdded = weight(toBeAdded.item, itemInHeap.item);

      if (weightWithToBeAdded < itemInHeap.weight) {
        changed = true;
        itemInHeap.to = toBeAdded.item;
        itemInHeap.weight = weightWithToBeAdded;
      }
    });

    if (changed) {
      heap.heapify();
    }

    if (animateMs) {
      await sleep(animateMs);
    }
  }

  return {
    edges,
    propertyCount: numberOfApartments,
    totalLength: totalLength,
    lengthPerProperty: totalLength / numberOfApartments,
    actualDensity: numberOfApartments / (totalLength / 1000)
  }
}
