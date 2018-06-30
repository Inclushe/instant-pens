#! /usr/bin/env node
var browserSync = require('browser-sync')
var chokidar = require('chokidar')
var watcher = undefined // might not need
var program = require('commander')
var chalk = require('chalk')
var logger = function (str) {
  console.log(chalk.blue('[Instant Pens] ') + str)
}
var packageJSON = require('./package.json')
var config
try {
  config = require('./config.json')
} catch (e) {
  config = {'defaultPreprocessors': {'html': 'none', 'css': 'none', 'js': 'none'}}
}
var childProcess = require('child_process')
var path = require('path')
var fs = require('fs')
var util = require('util')
var promisify = util.promisify

program
  .version(packageJSON.version)
  .usage('[options] [dir]')
  .description(packageJSON.description)
  .option('-p, --port <port>', 'sets the Browsersync port')
  .option('-u, --ui-port <port>', 'sets the Browsersync UI port')
  .option('-c, --config <file>', 'using configuration file')
  // .option('-d, --debug', 'Log debug statements')

program
  .command('add <preprocessor...>')
  .description('adds preprocessor packages')
  .option('-d, --debug', 'log debug statements')
  .option('--no-default', 'prevents saving packages as defaults')
  .action(function (args, options) {
    if (options.debug) console.log(args)
    // @TODO:
    var preprocessors = [];
    args.forEach(function (packageName) {
      if (packageJSON.devDependencies && packageJSON.devDependencies[packageName]) {
        logger(`${packageName} is already installed. Skipping.`)
        return
      }
      if (!packageJSON.config.supportedPackages[packageName]) {
        logger(`${packageName} is not a supported package/preprocessor. Skipping.`)
        return
      }
      preprocessors.push(packageName)
    })
    if (preprocessors.length > 0) {
      logger(`Installing: ${chalk.green(preprocessors.join(', '))}`)
      var installProgress = childProcess.spawn('npm', ['install', '--save-dev', ...preprocessors], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
      })
      installProgress.on('close', (code) => {
        preprocessors.forEach(function (packageName) {
          var preprocessorType = packageJSON.config.supportedPackages[packageName].preprocessorType
          config.defaultPreprocessors[preprocessorType] = packageName
        })
        promisify(fs.writeFile)(path.join(__dirname, 'config.json'), JSON.stringify(config))
          .then(() => { if (options.debug) logger('config.json was updated.') })
          .catch((e) => {
            logger(`${chalk.red('[ERROR]')} An error occurred when writing to config.json.`)
            console.error(e)
          })
        logger(`The following packages have been installed and enabled: ${chalk.green(preprocessors.join(', '))}`)
        logger(`Run ${chalk.blue('pen')} to use your preprocessors.`)
      })
      installProgress.on('error', (code) => {
        logger(`${chalk.red('[ERROR]')} An error occurred when installing packages. ${code}`)
      })
    } else {
      logger('No preprocessors to install.')
    }
  })

program
  .command('remove <preprocessor...>')
  .description('removes preprocessor packages')
  .action(function (args, options) {
    var preprocessors = []
    if (!packageJSON.devDependencies) {
      logger(`No preprocessors are installed.`)
      return
    }
    args.forEach((packageName) => {
      if ((packageJSON.devDependencies[packageName])) {
        preprocessors.push(packageName)
      }
    })
    if (preprocessors.length > 0) {
      logger(`Uninstalling: ${chalk.green(preprocessors.join(', '))}`)
      var installProgress = childProcess.spawn('npm', ['uninstall', '--save-dev', ...preprocessors], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
      })
      installProgress.on('close', (code) => {
        preprocessors.forEach(function (packageName) {
          var preprocessorType = packageJSON.config.supportedPackages[packageName].preprocessorType
          config.defaultPreprocessors[preprocessorType] = 'none'
        })
        promisify(fs.writeFile)(path.join(__dirname, 'config.json'), JSON.stringify(config))
          .then(() => { if (options.debug) logger('config.json was updated.') })
          .catch((e) => {
            logger(`${chalk.red('[ERROR]')} An error occurred when writing to config.json.`)
            console.error(e)
          })
        logger(`The following packages have been uninstalled: ${chalk.red(preprocessors.join(', '))}`)
      })
      installProgress.on('error', (code) => {
        logger(`${chalk.red('[ERROR]')} An error occurred when uninstalling packages. ${code}`)
      })
    } else {
      logger('No preprocessors to remove.')
    }
  })

program
  .command('create <dir>')
  .description('creates a new folder with selected preprocessors')
  .action(() => {
    console.log('create')
    // @TODO:
  })

program
  .command('default <preprocessor..>')
  .description('sets default preprocessors')
  .option('-h, --html', 'Chooses the default HTML preprocessor')
  .option('-c, --css', 'Chooses the default CSS preprocessor')
  .option('-j, --js', 'Chooses the default JS preprocessor')
  .action(() => {
    console.log('default')
    // @TODO: Should it be in config?
  })

program
  .command('config [options]]')
  .description('config')
  .action(() => {
    console.log('config')
    // @TODO:
  })

program.parse(process.argv)

function startBrowserSyncServer (dir) {
  // @TODO: Perhaps turn off file watching in browsersync since it is already doing it in chokidar?
}

function startChokidarServer (dir) {
  // @TODO:
}

function compileFile (path) {
  // @TODO: Map supported packages to filetypes
}

if (program.args.length === 0) {
  console.log('RUN THIS')
  startBrowserSyncServer(process.cwd())
  startChokidarServer(process.cwd())
  console.log(program.port)
  console.log(program.uiPort)
  console.log(program.config)
  console.log(process.cwd())
  console.log(__dirname)
}

if (program.args.length === 1) {
  // @TODO: Work with multiple folders
  startBrowserSyncServer(program.args[0])
  startChokidarServer(program.args[0])
  console.log(program.args[0])
  console.log(program.port)
  console.log(program.uiPort)
}

// if (options.default) {
//   var preprocessors = []
//   ;[program.default, ...program.args].forEach(function (packageName, index) {
//     if (packageJSON.config.supportedPackages.includes(packageName)) {
//       preprocessors.push(packageName)
//     } else {
//       console.log(`${packageName} is not a supported package/preprocessor. Skipping.`)
//     }
//   })
//   if (preprocessors.length > 0) {
//     console.log(`Installing: ${preprocessors.join(', ')}`)
//     var installProgress = childProcess.spawn('npm', ['i', ...preprocessors], {
//       cmd: __dirname,
//       stdio: 'inherit'
//     })
//         // console.log('The following packages have been installed and enabled:')
//         // console.log(preprocessors.join(', '))
//     installProgress.on('close', (code) => {
//       console.log(`child process exited with code ${code}`)
//     })
//     installProgress.on('error', (code) => {
//       console.log(`child process exited with code ${code}`)
//     })
//   }
// }
// console.log(__dirname)
// console.log(process.cwd())

// console.log(program)
