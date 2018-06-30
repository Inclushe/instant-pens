var packageJSON = require('./package.json')
var preprocessors = {}

// If preprocessor is installed, push to preprocessors object
for (var dependency in packageJSON.devDependencies) {
  if (packageJSON.config.supportedPackages[dependency]) {
    preprocessors[dependency] = require(dependency)
  }
}

module.exports = function (data, type) {

}
