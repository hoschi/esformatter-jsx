'use strict';

var extend = require('extend');
var findParent = require('./find-parent');
var falafel = require('./falafel-helper');
var libFormat = require('./format-jsx');
var ignore = require('esformatter-ignore');
var unformatted = require('./default-unformatted');

module.exports = {
  setOptions: function setOptions(opts, esformatter) {
    var me = this;
    opts = opts || {};
    me.opts = opts;
    me._esformatter = esformatter;

    var jsxOptions = opts.jsx || {};

    me.jsxOptions = extend(true, {
      formatJSX: true,
      attrsOnSameLineAsTag: true,
      maxAttrsOnTag: null,
      firstAttributeOnSameLine: false,
      alignWithFirstAttribute: true,
      JSXExpressionsSingleLine: true,
      formatJSXExpressions: true,
      JSXAttributeQuotes: '' }, jsxOptions);

    if (me.jsxOptions.maxAttrsOnTag < 1) {
      me.jsxOptions.maxAttrsOnTag = 1;
    }

    var htmlOptions = jsxOptions.htmlOptions || {};
    me.htmlOptions = extend(true, {
      brace_style: 'collapse', //eslint-disable-line
      indent_char: ' ', //eslint-disable-line
      // indentScripts: "keep",
      indent_size: 2, //eslint-disable-line
      max_preserve_newlines: 2, //eslint-disable-line
      preserve_newlines: true, //eslint-disable-line
      voidElements: [],
      // indent_handlebars: true
      unformatted: unformatted,
      wrap_line_length: 160 //eslint-disable-line
    }, htmlOptions);
  },
  stringBefore: function stringBefore(code) {
    var me = this;
    if (!me.jsxOptions.formatJSX) {
      return code;
    }

    me._ignore = me._ignore || [];

    var _ignore = Object.create(ignore);
    me._ignore.push(_ignore);

    code = _ignore.stringBefore(code);

    me._templateLiterals = me._templateLiterals || [];

    var templateLiterals = [];

    code = falafel(code, function (node) {
      if (node.type === 'ClassProperty') {
        if (node.value) {
          var oldSource = node.source();

          var formattedProp = '' + (node.static ? 'static ' : '') + node.key.source() + ' = ' + node.value.source() + (oldSource.match(/;$/) ? ';' : '');

          node.update(formattedProp);
        }
      }

      if (node.type === 'TemplateLiteral' && !findParent(node, 'JSXAttribute') && !findParent(node, 'TemplateLiteral')) {

        var idx = templateLiterals.length;
        var replaceString = '__TEMPORARY_VARIABLE__PLACEHOLDER___NODE__' + idx + '_';

        templateLiterals.push({
          code: node.source(),
          replacedWith: replaceString
        });

        node.update(replaceString);
      }

      if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'ClassMethod' || node.type === 'FunctionExpression' || node.type === 'ObjectMethod') {

        node.update(node.source().replace(/^async\s+function/, 'async function'));
        node.update(node.source().replace(/^async\s+\(\)/, 'async ()'));
      }

      if (node.type === 'Decorator') {
        if (node.parent.type !== 'ClassMethod' && node.parent.type !== 'ClassProperty') {
          node.update(node.source().replace(/^\s*@/, '____decorator__at_sign___') + ';/*__decorator__semi__open*/\n/*__decorator__semi__end*/');
        }
      }

      if (node.type === 'SpreadProperty') {
        var _source = node.source().replace(/^\s*\.\.\./, '____esfmt_spread_sign___:');
        node.update(_source);
      }
    }).toString();

    var response = libFormat.replaceJSXExpressionContainers(code);
    me._jsxExpressionContainers = response.containers;
    me._templateLiterals.push(templateLiterals);
    return response.source;
  },
  _restoreTemplateLiterals: function _restoreTemplateLiterals(source) {
    var me = this;

    var templateLiterals = me._templateLiterals.pop();
    templateLiterals = templateLiterals || [];

    templateLiterals.forEach(function (entry) {
      var code = entry.code;
      var replacedWith = entry.replacedWith;

      source = source.split(replacedWith).join(code);
    });

    return source;
  },
  stringAfter: function stringAfter(code) {
    var me = this;

    if (!me.jsxOptions.formatJSX) {
      return code;
    }

    var jsxOptions = me.jsxOptions;

    code = libFormat.restoreJSXExpressionContainers(code, me._jsxExpressionContainers, jsxOptions.spaceInJSXExpressionContainers, jsxOptions.removeSpaceBeforeClosingJSX);

    var htmlOptions = me.htmlOptions;

    var formatter = libFormat.create(htmlOptions, jsxOptions, me.opts, me._esformatter);

    var ast = falafel(code, function (node) {
      if (node.type !== 'JSXElement') {
        return;
      }
      var conditionalParent = findParent(node, 'ConditionalExpression');
      if (conditionalParent) {
        var formatted = formatter.format(node);
        node.update(formatted);
      }
    });

    code = ast.toString();

    // replace the spread operators
    code = code.replace(/____esfmt_spread_sign___\s*:\s*/g, '...');

    ast = falafel(code, function (node) {
      // support for ES7 Decorators
      if (node.type === 'CallExpression' && node.callee.source().indexOf('____decorator__at_sign___') > -1) {
        node.callee.update(node.callee.source().replace('____decorator__at_sign___', '@'));
      }
      if (node.type === 'Identifier' && node.source().indexOf('____decorator__at_sign___') > -1) {
        node.update(node.source().replace('____decorator__at_sign___', '@'));
      }
      if (node.type !== 'JSXElement') {
        return;
      }

      var formatted = void 0;
      if (!findParent(node, 'JSXElement')) {
        formatted = formatter.format(node);
        node.update(formatted);
      }
    });

    code = ast.toString();

    // this is to make sure all decorators comments were removed from the source
    code = code.replace(/;\s*\/\*__decorator__semi__open\*\/\n\s*\/\*__decorator__semi__end\*\//g, '');

    var _ignore = me._ignore.pop();

    code = _ignore.stringAfter(code);
    code = me._restoreTemplateLiterals(code);

    return code;
  }
};