const DELTA = 0.00001;

const leftMost = (coordinates) => {
  let leftMost = coordinates[0];

  coordinates.forEach(coordinate => {
    // The latter condition is to make the algorithm more stable
    if (coordinate[0] < leftMost[0] || (coordinate[0] === leftMost[0] && coordinate[1] < leftMost[1])) {
      leftMost = coordinate;
    }
  });

  return leftMost;
}

const isSame = (a, b) => {
  return Math.abs(a[0] - b[0]) < DELTA && Math.abs(a[1] - b[1]) < DELTA;
}

const angle = (a, b) => {
  const x = b[0] - a[0];
  const y = b[1] - a[1];

  return Math.atan2(y, x);
}

export const convexHull = (coordinates) => {
  const start = leftMost(coordinates);
  const hull = [start];
  let current = start;
  let previousAngleOpposite = Math.PI / 2 - Math.PI;

  while (true) {
    const rightMostAngle = null;
    const rightMost = null;

    coordinates.forEach(coordinate => {
      if (!isSame(coordinate, current)) {
        const a = angle(current, coordinate);

        const r = (a - previousAngleOpposite) % (2 * Math.PI);
        const rComp = (rightMostAngle - previousAngleOpposite) % (2 * Math.PI);

        if (rightMostAngle === null || r > rComp) {
          rightMostAngle = a;
          rightMost = coordinate;
        }
      }
    });

    if (isSame(start, rightMost)) {
      break;
    }

    hull.push(rightMost);
    current = rightMost;
    previousAngleOpposite = rightMostAngle - Math.PI;
  }

  return hull;
}
