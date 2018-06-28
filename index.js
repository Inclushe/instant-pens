#! /usr/bin/env node
var browserSync = require('browser-sync')
var chokidar = require('chokidar')
var program = require('commander')
var logger = require('eazy-logger').Logger({
  prefix: '{blue:[Instant Pens] '
})
var packageJSON = require('./package.json')
var childProcess = require('child_process')

program
  .version(packageJSON.version)
  .usage('[options] [dir]')
  .description(packageJSON.description)
  .option('-p, --port <port>', 'sets the Browsersync port')
  .option('-u, --ui-port <port>', 'sets the Browsersync UI port')
  .option('-c, --config <file>', 'using configuration file')
  .option('-d, --debug', 'Log debug statements')

program
  .command('add <preprocessor...>')
  .description('adds preprocessor packages')
  .action((args) => {
    console.log(args)
    // @TODO:
    var preprocessors = []
    ;args.forEach(function (packageName) {
      if (packageJSON.config.supportedPackages[packageName]) {
        preprocessors.push(packageName)
      } else {
        logger.info(`${packageName} is not a supported package/preprocessor. Skipping.`)
      }
    })
    if (preprocessors.length > 0) {
      logger.info(`Installing: ${preprocessors.join(', ')}`)
      // var installProgress = childProcess.spawn('npm', ['i', ...preprocessors], {
      //   cmd: __dirname,
      //   stdio: 'inherit'
      // })
      //     // console.log('The following packages have been installed and enabled:')
      //     // console.log(preprocessors.join(', '))
      // installProgress.on('close', (code) => {
      //   console.log(`child process exited with code ${code}`)
      // })
      // installProgress.on('error', (code) => {
      //   console.log(`child process exited with code ${code}`)
      // })
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