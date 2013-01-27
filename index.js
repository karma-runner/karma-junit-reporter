var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('xmlbuilder');


// TODO(vojta): refactor this, make it a provided object
var createErrorFormatter = function(basePath, urlRoot) {
  var URL_REGEXP = new RegExp('http:\\/\\/[^\\/]*' + urlRoot.replace(/\//g, '\\/') +
                              '(base|absolute)([^\\?\\s]*)(\\?[0-9]*)?', 'g');

  return function(msg, indentation) {
    // remove domain and timestamp from source files
    // and resolve base path / absolute path urls into absolute path
    msg = msg.replace(URL_REGEXP, function(full, prefix, path) {
      if (prefix === 'base') {
        return basePath + path;
      } else if (prefix === 'absolute') {
        return path;
      }
    });

    // indent every line
    if (indentation) {
      msg = indentation + msg.replace(/\n/g, '\n' + indentation);
    }

    return msg + '\n';
  };
};

var JUnitReporter = function(config, basePath, urlRoot, emitter, logger, helper) {
  var errorFormatter = createErrorFormatter(basePath, urlRoot);
  var outputFile = config.outputFile;
  var pkgName = config.suite;
  var log = logger.create('reporter.junit');

  var xml;
  var suites;
  var pendingFileWritings = 0;
  var fileWritingFinished = function() {};

  this.adapters = [];

  this.onRunStart = function(browsers) {
    suites = {};
    xml = builder.create('testsuites');

    var suite;
    var timestamp = (new Date()).toISOString().substr(0, 19);
    browsers.forEach(function(browser) {
      suite = suites[browser.id] = xml.ele('testsuite', {
        name: browser.name, 'package': pkgName, timestamp: timestamp, id: 0, hostname: os.hostname()
      });
      suite.ele('properties').ele('property', {name: 'browser.fullName', value: browser.fullName});
    });
  };

  this.onBrowserComplete = function(browser) {
    var suite = suites[browser.id];
    var result = browser.lastResult;

    suite.att('tests', result.total);
    suite.att('errors', result.disconnected || result.error ? 1 : 0);
    suite.att('failures', result.failed);
    suite.att('time', result.netTime / 1000);

    suite.ele('system-out');
    suite.ele('system-err');
  };

  this.onRunComplete = function() {
    var xmlToOutput = xml;

    pendingFileWritings++;
    helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, xmlToOutput.end({pretty: true}), function(err) {
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

    suites = xml = null;
  };

  this.onSpecComplete = function(browser, result) {
    var spec = suites[browser.id].ele('testcase', {
      name: result.description, time: result.time / 1000,
      classname: (pkgName ? pkgName + ' ' : '') + browser.name + '.' + result.suite.join(' ').replace(/\./g, '_')
    });

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

JUnitReporter.$inject = ['config.junitReporter', 'config.basePath', 'config.urlRoot', 'emitter',
    'logger', 'helper'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:junit': ['type', JUnitReporter]
};
