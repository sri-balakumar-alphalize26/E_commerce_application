module.exports = function (api) {
  api.cache(true);
  return {
    // zustand's middleware reads `import.meta.env`, which the browser preview
    // cannot run as it stands; this rewrites it. The phone builds are unaffected.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
