/* eslint-env node, es6 */
/* eslint no-console: 0, camelcase: 0 */
const fs = require('fs');
const PNG = require('pngjs').PNG;

/**
 * Get browserstack credentials from the properties file.
 * @returns {Object} The properties
 */
function getProperties() {
    let properties = {};
    try {
        let lines = fs.readFileSync(
            './git-ignore-me.properties', 'utf8'
        );
        lines.split('\n').forEach(function (line) {
            line = line.split('=');
            if (line[0]) {
                properties[line[0]] = line[1];
            }
        });

        if (!properties['browserstack.username']) {
            throw 'No username';
        }
    } catch (e) {
        throw 'BrowserStack credentials not given. Add username and ' +
            'accesskey to the git-ignore-me.properties file';
    }
    return properties;
}

const browserStackBrowsers = {
    'Mac.Chrome': {
        base: 'BrowserStack',
        browser: 'chrome',
        browser_version: '61.0',
        os: 'OS X',
        os_version: 'Sierra'
    },
    'Mac.Firefox': {
        base: 'BrowserStack',
        browser: 'firefox',
        browser_version: '56.0',
        os: 'OS X',
        os_version: 'Sierra'
    },
    'Mac.Safari': {
        base: 'BrowserStack',
        browser: 'safari',
        browser_version: '10.1',
        os: 'OS X',
        os_version: 'Sierra'
    },
    'Win.Chrome': {
        base: 'BrowserStack',
        browser: 'chrome',
        browser_version: '61.0',
        os: 'Windows',
        os_version: '10'
    },
    'Win.Edge': {
        base: 'BrowserStack',
        browser: 'edge',
        browser_version: '15.0',
        os: 'Windows',
        os_version: '10'
    },
    'Win.Firefox': {
        base: 'BrowserStack',
        browser: 'firefox',
        browser_version: '56.0',
        os: 'Windows',
        os_version: '10'
    },
    'Win.IE': {
        base: 'BrowserStack',
        browser: 'ie',
        browser_version: '11.0',
        os: 'Windows',
        os_version: '10'
    }
};

module.exports = function (config) {

    const argv = require('yargs').argv;

    // The tests to run by default
    const defaultTests = [
        'unit-tests/*/*'
    ];

    // Browsers
    let browsers = argv.browsers ?
        argv.browsers.split(',') :
        ['ChromeHeadless'];
    if (argv.browsers === 'all') {
        browsers = Object.keys(browserStackBrowsers);
    }

    const tests = (argv.tests ? argv.tests.split(',') : defaultTests)
        .map(path => `samples/${path}/demo.js`);

    // let files = getFiles();
    let files = require('./karma-files.json');

    let options = {
        basePath: '../', // Root relative to this file
        frameworks: ['qunit'],
        files: files.concat([
            {
                pattern: 'utils/samples/*.png', // testimage.png
                watched: false,
                included: false,
                served: true
            },

            // Set up
            'utils/samples/test-controller.js',
            'test/karma-setup.js'
        ], tests),

        // These ones fail
        exclude: [
            // The configuration currently loads classic mode only. Styled mode
            // needs to be a separate instance.
            'samples/unit-tests/series-pie/styled-mode/demo.js',
            // Themes alter the whole default options structure. Set up a
            // separate test suite? Or perhaps somehow decouple the options so
            // they are not mutated for later tests?
            'samples/unit-tests/themes/*/demo.js'
        ],
        reporters: ['imagecapture', 'progress'],
        port: 9876,  // karma web server port
        colors: true,
        logLevel: config.LOG_WARN,
        browsers: browsers,
        autoWatch: false,
        singleRun: true, // Karma captures browsers, runs the tests and exits
        concurrency: Infinity,
        plugins: [
            'karma-*',
            require('./karma-imagecapture-reporter.js')
        ],


        preprocessors: {
            // Preprocess the visual tests
            '**/highcharts/*/*/demo.js': ['generic']
        },

        /*
         The preprocessor intervenes with the visual tests and transform them
         to unit tests by comparing a bitmap of the genearated SVG to the
         reference image and asserting the difference.
         */
        genericPreprocessor: {
            rules: [{
                process: function (content, file, done) {
                    const path = file.path.replace(
                        /^.*?samples\/(highcharts|stock|maps)\/([a-z0-9\-]+\/[a-z0-9\-]+)\/demo.js$/g,
                        '$1/$2'
                    );
                    let assertion;

                    // Set reference image
                    if (argv.reference) {
                        assertion = `
                            getImage(chart, 'png')
                                .then(pngImg => {

                                    // Log it to be captured by the
                                    // image-capture reporter
                                    __karma__.log(
                                        'imagecapture',
                                        ['./samples/${path}/reference.png ' + pngImg]
                                    );
                                    assert.ok(
                                        true,
                                        'Reference created for ${path}'
                                    );
                                    done();
                                })
                                .catch(err => {
                                    assert.ok(
                                        false,
                                        'Reference failed for ${path}: ' + err
                                    );
                                    done();
                                });
                        `;

                    } else {

                        try {

                            // Read the reference file into an imageData array
                            let png = PNG.sync.read(
                                fs.readFileSync(`./samples/${path}/reference.png`)
                            );
                            let referenceData = Array.prototype.slice.call(
                                png.data,
                                0
                            ).join(',');

                            assertion = `
                                var referenceData = [${referenceData}];
                                getImage(chart)
                                    .then(imageData => {
                                        assert.strictEqual(
                                            compare(imageData, referenceData),
                                            0,
                                            'Diff ( debug: http://utils.highcharts.local/samples/#test/${path} )'
                                        );
                                        done();
                                    })
                                    .catch(err => {
                                        console.error(err);
                                        done();
                                    });
                            `;
                        } catch (e) {
                            assertion = `
                                assert.ok(false, 'Reference image loaded')
                                done();
                            `;
                        }
                    }


                    content = `
                    QUnit.test('${path}', function (assert) {

                        var done = assert.async();
                        ${content}

                        var chart = Highcharts.charts[
                            Highcharts.charts.length - 1
                        ];

                        ${assertion}
                        
                    });
                    `;
                    file.path = file.originalPath + '.preprocessed';
                    done(content);
                }
            }]
        }
    };


    if (browsers.some(browser => /^(Mac|Win)\./.test(browser))) {

        console.log(
            'BrowserStack initialized. Please wait while tests are ' +
            'uploaded and VMs prepared...'
        );

        let properties = getProperties();

        options.browserStack = {
            username: properties['browserstack.username'],
            accessKey: properties['browserstack.accesskey']
        };
        options.customLaunchers = browserStackBrowsers;

        // to avoid DISCONNECTED messages when connecting to BrowserStack
        options.browserDisconnectTimeout = 10000; // default 2000
        options.browserDisconnectTolerance = 1; // default 0
        options.browserNoActivityTimeout = 4 * 60 * 1000; // default 10000
        options.captureTimeout = 4 * 60 * 1000; // default 60000
    }

    config.set(options);
};
