#! /usr/bin/env node
var compile = require('./compile')
var packageJSON = require('./package.json')
var childProcess = require('child_process')
var path = require('path')
var fs = require('fs')
var util = require('util')
var promisify = util.promisify
var browserSync = require('browser-sync')
var chokidar = require('chokidar')
var watcher
var program = require('commander')
var chalk = require('chalk')
var supportedFileTypes = {}
var config

var logger = function (str) {
  console.log(chalk.blue('[Instant Pens] ') + str)
}

try {
  config = require('./config.json')
} catch (e) {
  config = {'defaultPreprocessors': {'html': 'none', 'css': 'none', 'js': 'none'}}
}

program
  .version(packageJSON.version)
  .usage('[options] [dir]')
  .description(packageJSON.description)
  .option('-p, --port <port>', 'sets the Browsersync port')
  .option('-u, --ui-port <port>', 'sets the Browsersync UI port')
  // .option('-c, --config <file>', 'using configuration file')
  // .option('-d, --dist', 'sets a dist folder (compiles to same folder otherwise)')
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
      if (packageName === 'html' || packageName === 'css' || packageName === 'js') {
        config.defaultPreprocessors[packageName] = 'none'
        return
      }
      if (packageJSON.devDependencies && packageJSON.devDependencies[packageName]) {
        logger(`${packageName} is already installed. Setting as a default preprocessor.`)
        var preprocessorType = packageJSON.config.supportedPackages[packageName].preprocessorType
        config.defaultPreprocessors[preprocessorType] = packageName
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
      promisify(fs.writeFile)(path.join(__dirname, 'config.json'), JSON.stringify(config))
        .then(() => {})
        .catch((e) => {
          logger(`${chalk.red('[ERROR]')} An error occurred when writing to config.json.`)
          console.error(e)
        })
      logger(chalk.bold('Default preprocessors:'))
      logger(`HTML: ${config.defaultPreprocessors.html}`)
      logger(` CSS: ${config.defaultPreprocessors.css}`)
      logger(`  JS: ${config.defaultPreprocessors.js}`)
    }
  })

program
  .command('remove <preprocessor...>')
  .description('removes preprocessor packages')
  .option('-d, --debug', 'log debug statements')
  .action(function (args, options) {
    var preprocessors = []
    if (!packageJSON.devDependencies) {
      logger('No preprocessors are installed.')
      return
    }
    args.forEach((packageName) => {
      if ((packageJSON.devDependencies[packageName])) {
        preprocessors.push(packageName)
      } else {
        logger(`${packageName} is not installed. Skipping.`)
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
  .description('creates a new folder with default preprocessors')
  .option('-d, --debug', 'log debug statements')
  .action((dir, options) => {
    var templates = {}
    Object.keys(config.defaultPreprocessors).forEach((key) => {
      var preprocessorPackage = config.defaultPreprocessors[key]
      if (options.debug) console.log(preprocessorPackage)
      var fileType = key
      if (preprocessorPackage !== 'none') {
        fileType = packageJSON.config.supportedPackages[preprocessorPackage].fileTypes[0]
      }
      templates[key] = {
        'type': fileType,
        'path': path.join(__dirname, `templates/${key}/index.${fileType}`)
      }
    })
    if (options.debug) console.log(templates)
    var folderPath = path.join(process.cwd(), dir)
    if (fs.existsSync(folderPath)) {
      logger(`'${dir}' already exists. Running anyway.`)
    } else {
      fs.mkdirSync(folderPath, (err) => {
        if (err) console.error(err)
      })
    }
    Promise
      .all([
        // @TODO: Change to writeFile?
        promisify(fs.copyFile)(templates.html.path, path.join(folderPath, `index.${templates.html.type}`)),
        promisify(fs.copyFile)(templates.css.path, path.join(folderPath, `index.${templates.css.type}`)),
        promisify(fs.copyFile)(templates.js.path, path.join(folderPath, `index.${templates.js.type}`))
      ])
      .then(() => {
        logger(`${dir} directory created with default preprocessor files.`)
      })
      .catch((e) => {
        logger(`${chalk.red('[ERROR]')} An error occurred copying files to the project folders.`)
        console.error(e)
      })
  })

program
  .command('default [preprocessor...]')
  .description('sets default preprocessors')
  // .option('-h, --html', 'Chooses the default HTML preprocessor')
  // .option('-c, --css', 'Chooses the default CSS preprocessor')
  // .option('-j, --js', 'Chooses the default JS preprocessor')
  .action((args) => {
    var preprocessors = [];
    if (!packageJSON.devDependencies) {
      logger('There are no preprocessors installed. Install preprocessors by running "pen add <preprocessor...>".')
      return
    }
    args.forEach(function (packageName) {
      if (packageName === 'html' || packageName === 'css' || packageName === 'js') {
        config.defaultPreprocessors[packageName] = 'none'
        return
      }
      if (!packageJSON.config.supportedPackages[packageName]) {
        logger(`${packageName} is not a supported package/preprocessor. Skipping.`)
        return
      }
      if (!packageJSON.devDependencies[packageName]) {
        logger(`${packageName} is not installed. Install it by running "pen add ${packageName}". Skipping`)
        return
      }
      preprocessors.push(packageName)
    })
    if (preprocessors.length > 0) {
      preprocessors.forEach(function (packageName) {
        var preprocessorType = packageJSON.config.supportedPackages[packageName].preprocessorType
        config.defaultPreprocessors[preprocessorType] = packageName
      })
    }
    promisify(fs.writeFile)(path.join(__dirname, 'config.json'), JSON.stringify(config))
      .then(() => {})
      .catch((e) => {
        logger(`${chalk.red('[ERROR]')} An error occurred when writing to config.json.`)
        console.error(e)
      })
    logger(chalk.bold('Default preprocessors:'))
    logger(`HTML: ${config.defaultPreprocessors.html}`)
    logger(` CSS: ${config.defaultPreprocessors.css}`)
    logger(`  JS: ${config.defaultPreprocessors.js}`)
  })

program
  .command('config [options]]')
  .description('config')
  .action(() => {
    console.log('config')
    // @TODO:
  })

program.parse(process.argv)

function compileFile (filePath) {
  // @TODO: Map supported packages to filetypes
  console.log(filePath)
  var parsedFile = path.parse(filePath)
  if (supportedFileTypes[parsedFile.ext]) {
    console.log(supportedFileTypes[parsedFile.ext])
    promisify(fs.readFile)(filePath, 'utf8')
      .then((data) => compile(data, supportedFileTypes[parsedFile.ext]))
      .then((compiledData) => {
        console.log(compiledData)
      })
      .catch((e) => {
        console.log(e.message ? e.message : e)
      })
  }
  browserSync.reload(filePath)
}

function startBrowserSyncServer (dir, options) {
  // @TODO: Perhaps turn off file watching in browsersync since it is already doing it in chokidar?
  browserSync.init({
    server: dir,
    port: options.port || 3000,
    ui: {
      port: options.uiPort || 3001
    }
  })
}

function startChokidarServer (dir) {
  for (var pack in packageJSON.config.supportedPackages) {
    packageJSON.config.supportedPackages[pack].fileTypes.forEach((fileType) => {
      supportedFileTypes['.' + fileType] = pack
    })
  }
  console.log(supportedFileTypes)
  watcher = chokidar.watch(dir, {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 50
    }
  })
  watcher
    .on('add', compileFile)
    .on('change', compileFile)
}

// Run Browsersync and Chokidar instance in current folder.
if (program.args.length === 0) {
  startBrowserSyncServer(process.cwd(), program)
  startChokidarServer(process.cwd())
  // console.log('RUN THIS')
  // console.log(program.port)
  // console.log(program.uiPort)
  // console.log(program.config)
  // console.log(process.cwd())
  // console.log(__dirname)
}

// Run Browsersync and Chokidar instance in a different folder.
if (program.args.length === 1) {
  // @TODO: Work with multiple folders
  startBrowserSyncServer(path.join(process.cwd(), program.args[0]))
  startChokidarServer(path.join(process.cwd(), program.args[0]))
  // console.log(program.args[0])
  // console.log(program.port)
  // console.log(program.uiPort)
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
