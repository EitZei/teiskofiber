import assert from 'assert';

import {
  convexHull
} from '../src/geo-utils';

describe('Convex hull', function () {
  describe('Simple cases', function () {
    /*
     *     #   #
     * 0-
     *     #   #
     *       |
     *       0
     */
    it('It should return bounding box for square coordinates around origo', function () {
      const coordinates = [
        [-1, -1],
        [-1, 1],
        [1, 1],
        [1, -1]
      ];

      assert.deepEqual(coordinates, convexHull(coordinates));
    });

    /*
     *     #   #
     * 0-
     *     #   #
     *       |
     *       0
     */
    it('It should return bounding box for square coordinates around origo (different order)', function () {
      const bb = [
        [-1, -1],
        [-1, 1],
        [1, 1],
        [1, -1]
      ];

      const coordinates = [
        [1, -1],
        [-1, -1],
        [-1, 1],
        [1, 1],
      ];

      assert.deepEqual(bb, convexHull(coordinates));
    });

    /*
     *     #   #
     *
     * 0-  #   #
     *
     *     |
     *     0
     */
    it('It should return bounding box for square coordinates above 0', function () {
      const coordinates = [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
      ];

      assert.deepEqual(coordinates, convexHull(coordinates));
    });
  });

  describe('Extra points', function () {
    /*
     *      #
     *
     *     #   #
     *
     *          #
     * 0-     #
     *
     *     |
     *     0
     */
    it('Points on the inside', function () {
      const bb = [
        [0, 3],
        [1, 5],
        [4, 3],
        [5, 1],
        [2, 0]
      ];

      const coordinates = [
        [0, 3],
        [1, 3], // inside
        [1, 5],
        [2, 2], // inside
        [4, 3],
        [5, 1],
        [2, 0]
      ];

      assert.deepEqual(bb, convexHull(coordinates));
    });
  });
});
