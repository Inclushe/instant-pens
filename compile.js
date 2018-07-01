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

module.exports = function (data, type) {
  return new Promise((resolve, reject) => {
    if (!preprocessors[type]) {
      reject(new Error({message: `The '${type}' dependency is not installed.`}))
    }
    try {
      promisify(preprocessors[type].render)(data)
        .then((compiledData) => {
          resolve(compiledData)
        })
        .catch((e) => {
          reject(e)
        })
    } catch (e) {
      reject(e)
    }
    // switch (type) {
    //   case 'pug':
    //     try {
    //       resolve(preprocessors['pug'].render(data))
    //     } catch (e) {
    //       reject(e)
    //     }
    //     break
    //   case 'stylus': {

    //   }
    // }
  })
}
