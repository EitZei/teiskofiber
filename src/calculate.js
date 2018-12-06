import Heap from './heap';
import {
  LineString
} from 'ol/geom.js';

let buildingId = 0;
const transformBuildings = features => features.map(feature => ({
  id: buildingId++,
  noApartments: feature.getProperties()['HUONEISTOJA_KPL'] || 1,
  geometry: feature.getGeometry()
}));

const line = (a, b) => new LineString([a.geometry.getFirstCoordinate(), b.geometry.getFirstCoordinate()]);

const weight = (l) => l.getLength();

const density = (length, noApartments) => noApartments / (length / 1000);

export const calculate = async ({
  buildings: inputBuildings,
  targetDensity,
  targetNoApartments,
  maxLineLength,
  progress
}) => {
  const buildings = transformBuildings(inputBuildings);

  const edgeHeap = new Heap((a, b) => a.weight - b.weight);

  for (var i = 0; i < buildings.length; i++) {
    for (var j = i; j < buildings.length; j++) {
      if (buildings[i] !== buildings[j]) {
        const l = line(buildings[i], buildings[j])
        const w = weight(l);

        if (w <= maxLineLength) {
          edgeHeap.push({
            from: buildings[i],
            to: buildings[j],
            line: l,
            weight: w
          });
        }
      }
    }
  }

  const treeIndex = [];

  for (var i = 0; i < buildings.length; i++) {
    const tree = {
      id: i,
      totalLength: 0,
      noApartments: buildings[i].noApartments,
      edges: [],
      buildings: [buildings[i]],
    }

    treeIndex[buildings[i].id] = tree;
  }

  console.log("Buildings", buildings.length, "Edges", edgeHeap.size(), "Index", treeIndex.length);

  const totalEdgeCount = edgeHeap.size();
  while (edgeHeap.size() > 0) {
    const shortestEdge = edgeHeap.pop();

    const fromTree = treeIndex[shortestEdge.from.id];
    const toTree = treeIndex[shortestEdge.to.id];

    if (fromTree === toTree) {
      continue;
    }

    const lineBetween = shortestEdge.line;

    const wouldBeTotalLength = fromTree.totalLength + toTree.totalLength + lineBetween.getLength();
    const wouldBeNoApartments = fromTree.noApartments + toTree.noApartments;
    const wouldBeDensity = density(wouldBeTotalLength, wouldBeNoApartments);

    if (typeof progress === 'function') {
      if (edgeHeap.size() % 100 === 0) {
        progress({
          total: totalEdgeCount,
          remaining: edgeHeap.size()
        });
      }
    }

    // Discard edges as it cannot form a dense enough tree
    if (wouldBeDensity < targetDensity) {
      continue;
    }

    fromTree.totalLength = wouldBeTotalLength;
    fromTree.noApartments = wouldBeNoApartments;
    fromTree.edges.push(lineBetween);
    fromTree.edges = fromTree.edges.concat(toTree.edges);
    fromTree.buildings = fromTree.buildings.concat(toTree.buildings)

    toTree.buildings.forEach(building => {
      treeIndex[building.id] = fromTree;
    })
  }

  const trees = [];
  treeIndex.forEach(tree => {
    if (trees.indexOf(tree) < 0) {
      trees.push(tree);
    }
  })

  const filteredTrees = trees.filter(tree => tree.noApartments >= targetNoApartments);

  return {
    trees: filteredTrees,
    propertyCount: 0,
    totalLength: 0,
    lengthPerProperty: 0,
    actualDensity: 0
  }
}
