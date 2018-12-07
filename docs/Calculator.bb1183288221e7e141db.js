/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/calculate.worker.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/calculate.worker.js":
/*!*********************************!*\
  !*** ./src/calculate.worker.js ***!
  \*********************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _heap__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./heap */ "./src/heap.js");
/* harmony import */ var _heap__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_heap__WEBPACK_IMPORTED_MODULE_0__);


const line = (a, b) => [a.coordinates, b.coordinates];

const weight = (l) => Math.sqrt(Math.pow(l[0][0] - l[1][0], 2) + Math.pow(l[0][1] - l[1][1], 2));

const density = (length, noApartments) => noApartments / (length / 1000);

const buildHeap = async (buildings, maxLineLength) => {
  const edgeHeap = new _heap__WEBPACK_IMPORTED_MODULE_0___default.a((a, b) => a.weight - b.weight);

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

    self.postMessage({
      status: 'progress',
      total: totalEdgeCount,
      remaining: edgeHeap.size()
    });

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


/***/ }),

/***/ "./src/heap.js":
/*!*********************!*\
  !*** ./src/heap.js ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// Generated by CoffeeScript 1.8.0
(function () {
  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

  floor = Math.floor, min = Math.min;
  /*
  Default comparison function to be used
   */

  defaultCmp = function defaultCmp(x, y) {
    if (x < y) {
      return -1;
    }

    if (x > y) {
      return 1;
    }

    return 0;
  };
  /*
  Insert item x in list a, and keep it sorted assuming a is sorted.
  
  If x is already in a, insert it to the right of the rightmost x.
  
  Optional args lo (default 0) and hi (default a.length) bound the slice
  of a to be searched.
   */


  insort = function insort(a, x, lo, hi, cmp) {
    var mid;

    if (lo == null) {
      lo = 0;
    }

    if (cmp == null) {
      cmp = defaultCmp;
    }

    if (lo < 0) {
      throw new Error('lo must be non-negative');
    }

    if (hi == null) {
      hi = a.length;
    }

    while (lo < hi) {
      mid = floor((lo + hi) / 2);

      if (cmp(x, a[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }

    return [].splice.apply(a, [lo, lo - lo].concat(x)), x;
  };
  /*
  Push item onto heap, maintaining the heap invariant.
   */


  heappush = function heappush(array, item, cmp) {
    if (cmp == null) {
      cmp = defaultCmp;
    }

    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
  };
  /*
  Pop the smallest item off the heap, maintaining the heap invariant.
   */


  heappop = function heappop(array, cmp) {
    var lastelt, returnitem;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    lastelt = array.pop();

    if (array.length) {
      returnitem = array[0];
      array[0] = lastelt;

      _siftup(array, 0, cmp);
    } else {
      returnitem = lastelt;
    }

    return returnitem;
  };
  /*
  Pop and return the current smallest value, and add the new item.
  
  This is more efficient than heappop() followed by heappush(), and can be
  more appropriate when using a fixed size heap. Note that the value
  returned may be larger than item! That constrains reasonable use of
  this routine unless written as part of a conditional replacement:
      if item > array[0]
        item = heapreplace(array, item)
   */


  heapreplace = function heapreplace(array, item, cmp) {
    var returnitem;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    returnitem = array[0];
    array[0] = item;

    _siftup(array, 0, cmp);

    return returnitem;
  };
  /*
  Fast version of a heappush followed by a heappop.
   */


  heappushpop = function heappushpop(array, item, cmp) {
    var _ref;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    if (array.length && cmp(array[0], item) < 0) {
      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];

      _siftup(array, 0, cmp);
    }

    return item;
  };
  /*
  Transform list into a heap, in-place, in O(array.length) time.
   */


  heapify = function heapify(array, cmp) {
    var i, _i, _j, _len, _ref, _ref1, _results, _results1;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    _ref1 = function () {
      _results1 = [];

      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--) {
        _results1.push(_j);
      }

      return _results1;
    }.apply(this).reverse();

    _results = [];

    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      i = _ref1[_i];

      _results.push(_siftup(array, i, cmp));
    }

    return _results;
  };
  /*
  Update the position of the given item in the heap.
  This function should be called every time the item is being modified.
   */


  updateItem = function updateItem(array, item, cmp) {
    var pos;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    pos = array.indexOf(item);

    if (pos === -1) {
      return;
    }

    _siftdown(array, 0, pos, cmp);

    return _siftup(array, pos, cmp);
  };
  /*
  Find the n largest elements in a dataset.
   */


  nlargest = function nlargest(array, n, cmp) {
    var elem, result, _i, _len, _ref;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    result = array.slice(0, n);

    if (!result.length) {
      return result;
    }

    heapify(result, cmp);
    _ref = array.slice(n);

    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      elem = _ref[_i];
      heappushpop(result, elem, cmp);
    }

    return result.sort(cmp).reverse();
  };
  /*
  Find the n smallest elements in a dataset.
   */


  nsmallest = function nsmallest(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    if (n * 10 <= array.length) {
      result = array.slice(0, n).sort(cmp);

      if (!result.length) {
        return result;
      }

      los = result[result.length - 1];
      _ref = array.slice(n);

      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];

        if (cmp(elem, los) < 0) {
          insort(result, elem, 0, null, cmp);
          result.pop();
          los = result[result.length - 1];
        }
      }

      return result;
    }

    heapify(array, cmp);
    _results = [];

    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      _results.push(heappop(array, cmp));
    }

    return _results;
  };

  _siftdown = function _siftdown(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    newitem = array[pos];

    while (pos > startpos) {
      parentpos = pos - 1 >> 1;
      parent = array[parentpos];

      if (cmp(newitem, parent) < 0) {
        array[pos] = parent;
        pos = parentpos;
        continue;
      }

      break;
    }

    return array[pos] = newitem;
  };

  _siftup = function _siftup(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;

    if (cmp == null) {
      cmp = defaultCmp;
    }

    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;

    while (childpos < endpos) {
      rightpos = childpos + 1;

      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
        childpos = rightpos;
      }

      array[pos] = array[childpos];
      pos = childpos;
      childpos = 2 * pos + 1;
    }

    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
  };

  Heap = function () {
    Heap.push = heappush;
    Heap.pop = heappop;
    Heap.replace = heapreplace;
    Heap.pushpop = heappushpop;
    Heap.heapify = heapify;
    Heap.updateItem = updateItem;
    Heap.nlargest = nlargest;
    Heap.nsmallest = nsmallest;

    function Heap(cmp) {
      this.cmp = cmp != null ? cmp : defaultCmp;
      this.nodes = [];
    }

    Heap.prototype.push = function (x) {
      return heappush(this.nodes, x, this.cmp);
    };

    Heap.prototype.pop = function () {
      return heappop(this.nodes, this.cmp);
    };

    Heap.prototype.peek = function () {
      return this.nodes[0];
    };

    Heap.prototype.contains = function (x) {
      return this.nodes.indexOf(x) !== -1;
    };

    Heap.prototype.replace = function (x) {
      return heapreplace(this.nodes, x, this.cmp);
    };

    Heap.prototype.pushpop = function (x) {
      return heappushpop(this.nodes, x, this.cmp);
    };

    Heap.prototype.heapify = function () {
      return heapify(this.nodes, this.cmp);
    };

    Heap.prototype.updateItem = function (x) {
      return updateItem(this.nodes, x, this.cmp);
    };

    Heap.prototype.clear = function () {
      return this.nodes = [];
    };

    Heap.prototype.empty = function () {
      return this.nodes.length === 0;
    };

    Heap.prototype.size = function () {
      return this.nodes.length;
    };

    Heap.prototype.clone = function () {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };

    Heap.prototype.toArray = function () {
      return this.nodes.slice(0);
    };

    Heap.prototype.insert = Heap.prototype.push;
    Heap.prototype.top = Heap.prototype.peek;
    Heap.prototype.front = Heap.prototype.peek;
    Heap.prototype.has = Heap.prototype.contains;
    Heap.prototype.copy = Heap.prototype.clone;
    return Heap;
  }();

  (function (root, factory) {
    if (true) {
      return !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    } else {}
  })(this, function () {
    return Heap;
  });
}).call(this);

/***/ })

/******/ });
//# sourceMappingURL=Calculator.bb1183288221e7e141db.js.map