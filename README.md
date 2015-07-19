# karma-junit-reporter

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/karma-runner/karma-junit-reporter)
 [![npm version](https://img.shields.io/npm/v/karma-junit-reporter.svg?style=flat-square)](https://www.npmjs.com/package/karma-junit-reporter) [![npm downloads](https://img.shields.io/npm/dm/karma-junit-reporter.svg?style=flat-square)](https://www.npmjs.com/package/karma-junit-reporter)

[![Build Status](https://img.shields.io/travis/karma-runner/karma-junit-reporter/master.svg?style=flat-square)](https://travis-ci.org/karma-runner/karma-junit-reporter) [![Dependency Status](https://img.shields.io/david/karma-runner/karma-junit-reporter.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-junit-reporter) [![devDependency Status](https://img.shields.io/david/dev/karma-runner/karma-junit-reporter.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-junit-reporter#info=devDependencies)

> Reporter for the JUnit XML format.

## Installation

The easiest way is to keep `karma-junit-reporter` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "karma": "~0.10",
    "karma-junit-reporter": "~0.2"
  }
}
```

You can simple do it by:
```bash
npm install karma-junit-reporter --save-dev
```

## Configuration
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    reporters: ['progress', 'junit'],

    // the default configuration
    junitReporter: {
      outputDir: '', // results will be saved as $outputDir/$browserName.xml
      outputFile: undefined // if included, results will be saved as $outputDir/$browserName/$outputFile
      suite: ''
    }
  });
};
```

You can pass list of reporters as a CLI argument too:
```bash
karma start --reporters junit,dots
```

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
