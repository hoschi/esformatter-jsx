'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var opts = require('./parser-options');
var babylon = require('babylon');

function insertHelpers(node, parent, chunks) {
  node.parent = parent;
  node.source = function source() {
    return chunks.slice(node.start, node.end).join('');
  };
  function update(s) {
    chunks[node.start] = s;
    for (var i = node.start + 1; i < node.end; ++i) {
      chunks[i] = '';
    }
  }
  if (node.update && _typeof(node.update) === 'object') {
    var prev = node.update;
    Object.keys(prev).forEach(function (key) {
      update[key] = prev[key];
    });
  }
  node.update = update;
}

module.exports = function falafelHelper(str, cb) {
  // module.exports = function (src, opts, fn) {
  if (str && (typeof str === 'undefined' ? 'undefined' : _typeof(str)) === 'object' && str.constructor.name === 'Buffer') {
    str = str.toString();
  }
  if (typeof str !== 'string') {
    str = String(str);
  }
  var ast = babylon.parse(str, opts);
  var result = {
    chunks: str.split(''),
    inspect: function inspect() {
      return result.toString();
    },
    toString: function toString() {
      return result.chunks.join('');
    }
  };
  function walk(node, parent) {
    insertHelpers(node, parent, result.chunks);
    Object.keys(node).forEach(function (key) {
      if (key === 'parent') {
        return;
      }
      var child = node[key];
      if (Array.isArray(child)) {
        child.forEach(function (c) {
          if (c && typeof c.type === 'string') {
            walk(c, node);
          }
        });
      } else if (child && typeof child.type === 'string') {
        walk(child, node);
      }
    });
    cb(node);
  }
  walk(ast);
  return result;
};