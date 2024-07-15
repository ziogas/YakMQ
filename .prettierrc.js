module.exports = {
  trailingComma: 'es5',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  printWidth: 120,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: ['^[.]'],
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
};
