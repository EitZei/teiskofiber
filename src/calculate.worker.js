import Heap from './heap';

const line = (a, b) => [a.coordinates, b.coordinates];

const weight = (l) => Math.sqrt(Math.pow(l[0][0] - l[1][0], 2) + Math.pow(l[0][1] - l[1][1], 2));

const density = (length, noApartments) => noApartments / (length / 1000);

const buildHeap = async (buildings, maxLineLength) => {
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
            length: w,
            weight: w
          });
        }
      }
    }
  }

  return edgeHeap;
}

const buildTreeIndex = async buildings => {
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

  return treeIndex;
}

const mst = async (edgeHeap, treeIndex, targetDensity) => {
  const totalEdgeCount = edgeHeap.size();
  while (edgeHeap.size() > 0) {
    const shortestEdge = edgeHeap.pop();

    const fromTree = treeIndex[shortestEdge.from.id];
    const toTree = treeIndex[shortestEdge.to.id];

    if (fromTree === toTree) {
      continue;
    }

    const wouldBeTotalLength = fromTree.totalLength + toTree.totalLength + shortestEdge.length;
    const wouldBeNoApartments = fromTree.noApartments + toTree.noApartments;
    const wouldBeDensity = density(wouldBeTotalLength, wouldBeNoApartments);

    if (edgeHeap.size() % 1000 === 0) {
      self.postMessage({
        status: 'progress',
        total: totalEdgeCount,
        remaining: edgeHeap.size()
      });
    }

    // Discard edges as it cannot form a dense enough tree
    if (wouldBeDensity < targetDensity) {
      continue;
    }

    fromTree.totalLength = wouldBeTotalLength;
    fromTree.noApartments = wouldBeNoApartments;
    fromTree.edges.push(shortestEdge.line);
    fromTree.edges = fromTree.edges.concat(toTree.edges);
    fromTree.buildings = fromTree.buildings.concat(toTree.buildings)

    toTree.buildings.forEach(building => {
      treeIndex[building.id] = fromTree;
    })
  }
}

const filterTrees = async (treeIndex, targetNoApartments) => {
  const trees = [];
  treeIndex.forEach(tree => {
    if (trees.indexOf(tree) < 0) {
      trees.push(tree);
    }
  })

  return trees.filter(tree => tree.noApartments >= targetNoApartments);
}

self.addEventListener('message', async ({
  data
}) => {

  const buildings = data.buildings;

  const edgeHeap = await buildHeap(buildings, data.maxLineLength);

  const treeIndex = await buildTreeIndex(buildings);

  console.log("Buildings", buildings.length, "Edges", edgeHeap.size(), "Index", treeIndex.length);

  await mst(edgeHeap, treeIndex, data.targetDensity);

  const filteredTrees = await filterTrees(treeIndex, data.targetNoApartments);

  self.postMessage({
    status: 'done',
    trees: filteredTrees
  });
});
