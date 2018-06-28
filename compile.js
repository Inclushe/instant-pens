var packageJSON = require('./package.json')
var preprocessors = {}

// If preprocessor is installed, push to preprocessors object
for (var dependency in packageJSON.dependencies) {
  if (packageJSON.config.supportedPackages[dependency]) {
    preprocessors[dependency] = require(dependency)
  }
}

var logger = require('eazy-logger').Logger({
  prefix: '{blue:[Instant Pens]} '
})

logger.info('test')

module.exports = function (data, type) {

}
