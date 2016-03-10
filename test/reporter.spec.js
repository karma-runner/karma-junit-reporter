'use strict'

var chai = require('chai')
var expect = require('chai').expect
var sinon = require('sinon')
var proxyquire = require('proxyquire')

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
})
