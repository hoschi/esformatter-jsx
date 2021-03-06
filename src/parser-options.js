module.exports = {
  // attach range information to each node
  ranges: true,

  // attach line/column location information to each node
  locations: true,
  sourceType: 'module',
  allowHashBang: true,
  ecmaVersion: 7, // i hope sometime in the future!
  playground: true,
  preserveParens: true,
  plugins: [
    'jsx',
    'flow',
    'asyncFunctions',
    'classConstructorCall',
    'doExpressions',
    'trailingFunctionCommas',
    'objectRestSpread',
    'decorators',
    'classProperties',
    'exportExtensions',
    'exponentiationOperator',
    'asyncGenerators',
    'functionBind',
    'dynamicImport',
  ],
};
