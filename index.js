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

function logger (str) {
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
  // .on('--help') @TODO:

program
  .command('add <preprocessor...>')
  .description('adds preprocessor packages')
  .option('-d, --debug', 'log debug statements')
  .option('--no-default', 'prevents saving packages as defaults')
  .action(function (args, options) {
    if (options.debug) console.log(args)
    var preprocessors = []
    // Push valid preprocessor packages into `preprocessors`
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
      // Install all packages in `preprocessors`
      logger(`Installing: ${chalk.green(preprocessors.join(', '))}`)
      var installProgress = childProcess.spawn('npm', ['install', '--save-dev', ...preprocessors], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
      })
      installProgress.on('close', (code) => {
        // Save new preprocessors as defaults in config.json (turn off using --no-default)
        if (!options.noDefault) {
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
        }
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
      // Uninstall and remove dependencies from package.json and node_modules/
      var installProgress = childProcess.spawn('npm', ['uninstall', '--save-dev', ...preprocessors], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
      })
      installProgress.on('close', (code) => {
        // Remove uninstalled packages from config.json
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
    // Push files from the templates folder that correlate with the default preprocessors to `templates`
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
    // Copy files over to the new directory
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
        // @TODO: Change to writeFile and change directories?
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
    var preprocessors = []
    if (!packageJSON.devDependencies) {
      logger('There are no preprocessors installed. Install preprocessors by running "pen add <preprocessor...>".')
      return
    }
    // Push installed packages to `preprocessors`
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
    // Save defaults to config.json
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

// program
//   .command('config [options]]')
//   .description('config')
//   .action(() => {
//     console.log('config')
//     // @TODO:
//   })

program.parse(process.argv)

function compileFile (filePath) {
  console.log(filePath)
  var parsedFile = path.parse(filePath)
  // Compile preprocesser file types
  if (supportedFileTypes[parsedFile.ext]) {
    console.log(supportedFileTypes[parsedFile.ext])
    promisify(fs.readFile)(filePath, 'utf8')
      .then((data) => compile(data, supportedFileTypes[parsedFile.ext]))
      .then((compiledData) => {
        console.log(compiledData) // @TODO: Compile to new file
      })
      .catch((e) => {
        console.log(e.message ? e.message : e)
      })
  }
  // @TODO: Compile or copy to dist folder
  browserSync.reload(filePath)
}

function startBrowserSyncServer (dir, options) {
  browserSync.init({
    server: dir,
    port: options.port || 3000,
    ui: {
      port: options.uiPort || 3001
    }
  })
}

function startChokidarServer (dir) {
  // Maps preprocessor file types to `supportedFileTypes`
  for (var pack in packageJSON.config.supportedPackages) {
    packageJSON.config.supportedPackages[pack].fileTypes.forEach((fileType) => {
      supportedFileTypes['.' + fileType] = pack
    })
  }
  console.log(supportedFileTypes)
  watcher = chokidar.watch(dir, {
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 50 // Fixes issues when working in Ubuntu @TODO: Take out?
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
