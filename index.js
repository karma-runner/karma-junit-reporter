var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('xmlbuilder');

var JUnitReporter = function(baseReporterDecorator, config, emitter, logger, helper, formatError) {
  var outputDir = config.outputDir;
  var pkgName = config.suite;
  var log = logger.create('reporter.junit');

  var suites;
  var pendingFileWritings = 0;
  var fileWritingFinished = function() {};
  var allMessages = [];

  if (outputDir.substr(-1) != path.sep) {
    outputDir += path.sep;
  }

  baseReporterDecorator(this);

  this.adapters = [function(msg) {
    allMessages.push(msg);
  }];

  this.onRunStart = function(browsers) {
    suites = {};

    var suite;
    var timestamp = (new Date()).toISOString().substr(0, 19);
    browsers.forEach(function(browser) {

      pendingFileWritings++;

      suite = suites[browser.id] = builder.create('testsuite');
      suite.att('name', pkgName ? pkgName + ' / ' + browser.name : browser.name)
           .att('timestamp', timestamp)
           .att('hostname', os.hostname());
      suite.ele('properties')
           .ele('property', {name: 'browser.fullName', value: browser.fullName});
    });
  };

  this.onBrowserComplete = function(browser) {
    var suite = suites[browser.id];
    var result = browser.lastResult;
    var outputFile = outputDir + 'TEST-' + browser.name.replace(/ /g, '_') + '.xml';

    suite.att('tests', result.total);
    suite.att('errors', result.disconnected || result.error ? 1 : 0);
    suite.att('failures', result.failed);
    suite.att('time', (result.netTime || 0) / 1000);

    suite.ele('system-out').dat(allMessages.join() + '\n');
    suite.ele('system-err');

    helper.mkdirIfNotExists(outputDir, function() {

      fs.writeFile(outputFile, suite.end({pretty: true}), function(err) {
        if (err) {
          log.warn('Cannot write JUnit xml\n\t' + err.message);
        } else {
          log.debug('JUnit results written to "%s".', outputFile);
        }

        if (!--pendingFileWritings) {
          fileWritingFinished();
        }
      });
    });
  };

  this.onRunComplete = function() {
    suites = null;
    allMessages.length = 0;
  };

  this.specSuccess = this.specSkipped = this.specFailure = function(browser, result) {
    var spec = suites[browser.id].ele('testcase', {
      name: result.description,
      time: ((result.time || 0) / 1000),
      classname: (pkgName ? pkgName + '.' : '') + result.suite.join(' ').replace(/\./g, '_')
    });

    if (result.skipped) {
      spec.ele('skipped');
    }

    if (!result.success) {
      result.log.forEach(function(err) {
        spec.ele('failure', {type: ''}, formatError(err));
      });
    }
  };

  // TODO(vojta): move to onExit
  // wait for writing all the xml files, before exiting
  emitter.on('exit', function(done) {
    if (pendingFileWritings) {
      fileWritingFinished = done;
    } else {
      done();
    }
  });
};

JUnitReporter.$inject = ['baseReporterDecorator', 'config.junitReporter', 'emitter', 'logger',
    'helper', 'formatError'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:junit': ['type', JUnitReporter]
};
