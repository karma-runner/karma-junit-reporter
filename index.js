var os = require('os')
var path = require('path')
var fs = require('fs')
var builder = require('xmlbuilder')

var JUnitReporter = function (baseReporterDecorator, config, logger, helper, formatError) {
  var log = logger.create('reporter.junit')
  var reporterConfig = config.junitReporter || {}
  var pkgName = reporterConfig.suite || ''
  var outputDir = reporterConfig.outputDir

  var suites
  var pendingFileWritings = 0
  var fileWritingFinished = function () {}
  var allMessages = []

  if (outputDir == null) {
    outputDir = '.'
  }

  outputDir = helper.normalizeWinPath(path.resolve(config.basePath, outputDir)) + path.sep

  baseReporterDecorator(this)

  this.adapters = [function (msg) {
    allMessages.push(msg)
  }]

  var initliazeXmlForBrowser = function (browser) {
    var timestamp = (new Date()).toISOString().substr(0, 19)
    var suite = suites[browser.id] = builder.create('testsuite')
    suite.att('name', browser.name)
         .att('package', pkgName)
         .att('timestamp', timestamp)
         .att('id', 0)
         .att('hostname', os.hostname())
    suite.ele('properties')
         .ele('property', {name: 'browser.fullName', value: browser.fullName})
  }

  var writeXmlForBrowser = function (browser) {
    var outputFile = outputDir + 'TESTS-' + browser.name.replace(/ /g, '_') + '.xml'
    var xmlToOutput = suites[browser.id]

    pendingFileWritings++
    helper.mkdirIfNotExists(outputDir, function () {
      fs.writeFile(outputFile, xmlToOutput.end({pretty: true}), function (err) {
        if (err) {
          log.warn('Cannot write JUnit xml\n\t' + err.message)
        } else {
          log.debug('JUnit results written to "%s".', outputFile)
        }

        if (!--pendingFileWritings) {
          fileWritingFinished()
        }
      })
    })
  }

  this.onRunStart = function (browsers) {
    suites = Object.create(null)

    // TODO(vojta): remove once we don't care about Karma 0.10
    browsers.forEach(initliazeXmlForBrowser)
  }

  this.onBrowserStart = function (browser) {
    initliazeXmlForBrowser(browser)
  }

  this.onBrowserComplete = function (browser) {
    var suite = suites[browser.id]
    var result = browser.lastResult

    suite.att('tests', result.total)
    suite.att('errors', result.disconnected || result.error ? 1 : 0)
    suite.att('failures', result.failed)
    suite.att('time', (result.netTime || 0) / 1000)

    suite.ele('system-out').dat(allMessages.join() + '\n')
    suite.ele('system-err')

    writeXmlForBrowser(browser)
  }

  this.onRunComplete = function () {
    suites = null
    allMessages.length = 0
  }

  this.specSuccess = this.specSkipped = this.specFailure = function (browser, result) {
    var spec = suites[browser.id].ele('testcase', {
      name: result.description, time: ((result.time || 0) / 1000),
      classname: browser.name.replace(/ /g, '_').replace(/\./g, '_') + '.' + (pkgName ? pkgName + '.' : '') + result.suite[0]
    })

    if (result.skipped) {
      spec.ele('skipped')
    }

    if (!result.success) {
      result.log.forEach(function (err) {
        spec.ele('failure', {type: ''}, formatError(err))
      })
    }
  }

  // wait for writing all the xml files, before exiting
  this.onExit = function (done) {
    if (pendingFileWritings) {
      fileWritingFinished = done
    } else {
      done()
    }
  }
}

JUnitReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError']

// PUBLISH DI MODULE
module.exports = {
  'reporter:junit': ['type', JUnitReporter]
}
