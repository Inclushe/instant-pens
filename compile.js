var packageJSON = require('./package.json')
var util = require('util')
var promisify = util.promisify
var preprocessors = {}

// If preprocessor is installed, push to preprocessors object
for (var dependency in packageJSON.devDependencies) {
  if (packageJSON.config.supportedPackages[dependency]) {
    preprocessors[dependency] = require(dependency)
  }
}

module.exports = function (data, type, path) {
  return new Promise((resolve, reject) => {
    if (!preprocessors[type]) {
      reject(new Error(`The '${type}' dependency is not installed. Run 'pen add ${type}' to install.`))
    }
    switch (type) {
      case 'pug':
      case 'stylus':
        try {
          promisify(preprocessors[type].render)(data, {
            'filename': path
          })
            .then((compiledData) => {
              resolve(compiledData)
            })
            .catch((e) => {
              reject(e)
            })
        } catch (e) {
          reject(e)
        }
        break
    }
  })
}
