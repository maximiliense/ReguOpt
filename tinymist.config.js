// tinymist.config.js
// Exclude the 'typst/' directory from compilation
module.exports = {
  entryPoints: ["**/*.typ", "!typst/**/*.typ"],
};
