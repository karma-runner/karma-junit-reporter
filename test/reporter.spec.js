'use strict'

var chai = require('chai')
var expect = require('chai').expect
var sinon = require('sinon')
var proxyquire = require('proxyquire')
var xsd = require('libxml-xsd')

// Validation schema is read from a file
var schemaPath = './sonar-unit-tests.xsd'

chai.use(require('sinon-chai'))

function noop () {}

var fakeLogger = {
  create: noop
}

var fakeHelper = {
  normalizeWinPath: noop,
  mkdirIfNotExists: sinon.stub().yields()
}

var fakeConfig = {
  basePath: __dirname,
  junitReporter: {
    outputFile: ''
  }
}

// Rule of thumb:
// - If you test the new XML format, remember to (within that test) create a new fake reporter,
//   passing it also this line in the fake config: "fakeConfig.junitReporter.xmlVersion: 1"

var fakeBaseReporterDecorator = noop

describe('JUnit reporter', function () {
  var reporterModule
  var reporter

  var fakeFs

  beforeEach(function () {
    fakeFs = {
      writeFile: sinon.spy()
    }

    reporterModule = proxyquire('..', {
      fs: fakeFs
    })
  })

  beforeEach(function () {
    reporter = new reporterModule['reporter:junit'][1](fakeBaseReporterDecorator, fakeConfig, fakeLogger, fakeHelper)
  })

  it('should produce valid XML per the new SonarQube reporting format', function () {
    // Two differences in this test, compared to other tests:
    // a) we have a different configuration for the reporter
    // b) need a instantiation of the reporter - the beforeEach doesn't work since it is for old XML
    var fakeBrowser = {
      id: 'Android_4_1_2',
      name: 'Android',
      fullName: 'Android 4.1.2',
      lastResult: {
        error: false,
        total: 1,
        failed: 0,
        netTime: 10 * 1000
      }
    }
    // Static result, since we don't actually produce the result through Karma
    var fakeResult = {
      suite: [
        'Sender',
        'using it',
        'get request'
      ],
      description: 'should not fail',
      log: []
    }
    // Requesting test for NEW xml format. Do not recycle the config used by OTHER tests,
    // since this would ruin them. Remember: since tests can run in undefined order, the side
    // effects (like configuration) must be carefully considered. beforeEach() caters for other tests
    // automatically.
    var newFakeConfig = {
      basePath: __dirname,
      junitReporter: {
        outputFile: '',
        xmlVersion: 1
      }
    }
    // Grab a new reporter, configured with xmlVersion flag
    var nxreporter = new reporterModule['reporter:junit'][1](fakeBaseReporterDecorator, newFakeConfig, fakeLogger, fakeHelper)
    nxreporter.onRunStart([ fakeBrowser ])
    nxreporter.specSuccess(fakeBrowser, fakeResult)
    nxreporter.onBrowserComplete(fakeBrowser)
    nxreporter.onRunComplete()

    var writtenXml = fakeFs.writeFile.firstCall.args[1]
    var extFileError = false
    var xmlParseError = false

    var validationErrorCount = 0
    var validationErrors = null

    xsd.parseFile(schemaPath, function (err, schema) {
      if (err) {
        extFileError = true
        xmlParseError = false
      } else {
        // Direct (sync) way of using the libxml-xsd
        validationErrors = schema.validate(writtenXml)
        if (!validationErrors) {
          validationErrors = []
          xmlParseError = false
        } else {
          validationErrorCount = validationErrors.length
        }
      }
    })

    // The 2 tests below are "static", weak tests that find whether a
    // string is present in the XML report
    expect(writtenXml).to.have.string('testCase name="Sender using it get request should not fail"')
    expect(writtenXml).to.have.string('unitTest')
    // The below is the strict, libxml-xsd -based validation result
    expect(validationErrorCount).to.equal(0)
    expect(extFileError).to.be.false
    expect(xmlParseError).to.be.false
  })

  it('should include parent suite names in generated test names', function () {
    var fakeBrowser = {
      id: 'Android_4_1_2',
      name: 'Android',
      fullName: 'Android 4.1.2',
      lastResult: {
        error: false,
        total: 1,
        failed: 0,
        netTime: 10 * 1000
      }
    }

    var fakeResult = {
      suite: [
        'Sender',
        'using it',
        'get request'
      ],
      description: 'should not fail',
      log: []
    }

    reporter.onRunStart([ fakeBrowser ])
    reporter.specSuccess(fakeBrowser, fakeResult)
    reporter.onBrowserComplete(fakeBrowser)
    reporter.onRunComplete()

    expect(fakeFs.writeFile).to.have.been.called

    var writtenXml = fakeFs.writeFile.firstCall.args[1]
    expect(writtenXml).to.have.string('testcase name="Sender using it get request should not fail"')
  })

  it('should safely handle missing suite browser entries when specSuccess fires', function () {
    reporter.onRunStart([])
    // don't try to call null.ele()
    expect(reporter.specSuccess.bind(reporter, {id: 1}, {})).to.not.throw(TypeError)
  })

  it('should safely handle invalid test result objects when onBrowserComplete fires', function () {
    var badBrowserResult = {
      id: 'Android_4_1_2',
      name: 'Android',
      fullName: 'Android 4.1.2',
      lastResult: {
        error: true,
        netTime: 0
      }
    }

    reporter.onRunStart([ badBrowserResult ])

    // never pass a null value to XMLAttribute via xmlbuilder attr()
    expect(reporter.onBrowserComplete.bind(reporter, badBrowserResult)).not.to.throw(Error)
  })

  it('should safely handle test re-runs triggered by watchers', function () {
    var fakeBrowser = {
      id: 'Android_4_1_2',
      name: 'Android',
      fullName: 'Android 4.1.2',
      lastResult: {
        error: false,
        total: 1,
        failed: 0,
        netTime: 10 * 1000
      }
    }

    reporter.onRunStart([ fakeBrowser ])
    reporter.onBrowserStart(fakeBrowser)

    // When a watcher triggers a second test run, onRunStart() for the second
    // run gets triggered, followed by onRunComplete() from the first test run.
    reporter.onRunStart([ fakeBrowser ])
    reporter.onRunComplete()

    reporter.onBrowserStart(fakeBrowser)
    reporter.onBrowserComplete(fakeBrowser)
    reporter.onRunComplete()
  })
})
