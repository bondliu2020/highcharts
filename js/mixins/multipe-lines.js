/**
 * (c) 2010-2018 Wojciech Chmiel
 *
 * License: www.highcharts.com/license
 */

'use strict';

import H from '../parts/Globals.js';
import '../parts/Utilities.js';

var each = H.each,
    merge = H.merge,
    error = H.error,
    defined = H.defined,
    SMA = H.seriesTypes.sma;

/**
 * Mixin useful for all indicators that have more than one line.
 * Merge it with your implementation where you will provide
 * getValues method appropriate to your indicator and pointArrayMap,
 * pointValKey, linesApiNames properites. Notice that pointArrayMap
 * should be consistent with amount of lines calculated in getValues method.
 */
var multipleLinesMixin = {
    /**
     * Lines ids. Required to plot appropriate amount of lines.
     * Notice that pointArrayMap should have more elements than
     * linesApiNames, because it contains main line and additional lines ids.
     * Also it should be consistent with amount of lines calculated in
     * getValues method from your implementation.
     * @type {Array}
     */
    pointArrayMap: ['top', 'bottom'],

    /**
     * Main line id.
     * @type {string}
     */
    pointValKey: 'top',

    /**
     * Additional lines DOCS names. Elements of linesApiNames array should
     * be consistent with DOCS line names defined in your implementation.
     * Notice that linesApiNames should have decreased amount of elements
     * relative to pointArrayMap (without pointValKey).
     * @type {Array}
     */
    linesApiNames: ['bottomLine'],

    /**
     * Create translatedLines Collection based on pointArrayMap.
     * @param {string} excludedValue pointValKey - main line id
     * @returns {Array} Returns translated lines names without excluded value.
     */
    getTranslatedLinesNames: function (excludedValue) {
        var translatedLines = [];

        each(this.pointArrayMap, function (propertyName) {
            if (propertyName !== excludedValue) {
                translatedLines.push(
                    'plot' +
                    propertyName.charAt(0).toUpperCase() +
                    propertyName.slice(1)
                );
            }
        });

        return translatedLines;
    },
    /**
     * @param {string} point
     * @returns {Array} Returns point Y value for all lines
     */
    toYData: function (point) {
        var pointColl = [];

        each(this.pointArrayMap, function (propertyName) {
            pointColl.push(point[propertyName]);
        });
        return pointColl;
    },
    /**
     * Add lines plot pixel values.
     */
    translate: function () {
        var indicator = this,
            // self - multipleLinesMixin reference
            self = Object.getPrototypeOf(indicator),
            pointArrayMap = self.pointArrayMap,
            LinesNames = [],
            value;

        LinesNames = self.getTranslatedLinesNames();

        SMA.prototype.translate.apply(indicator, arguments);

        each(indicator.points, function (point) {
            each(pointArrayMap, function (propertyName, i) {
                value = point[propertyName];

                if (value !== null) {
                    point[LinesNames[i]] = indicator.yAxis.toPixels(
                        value,
                        true
                    );
                }
            });
        });
    },
    /**
     * Draw main and additional lines.
     */
    drawGraph: function () {
        var indicator = this,
            // self - multipleLinesMixin reference
            self = Object.getPrototypeOf(indicator),
            pointValKey = self.pointValKey,
            linesApiNames = self.linesApiNames,
            mainLinePoints = indicator.points,
            pointsLength = mainLinePoints.length,
            mainLineOptions = indicator.options,
            mainLinePath = indicator.graph,
            gappedExtend = {
                options: {
                    gapSize: mainLineOptions.gapSize
                }
            },
            secondaryLines = [], // additional lines point place holders
            secondaryLinesNames = self.getTranslatedLinesNames(
                pointValKey
            ),
            point;


        // Generate points for additional lines:
        each(secondaryLinesNames, function (plotLine, index) {

            // create additional lines point place holders
            secondaryLines[index] = [];

            while (pointsLength--) {
                point = mainLinePoints[pointsLength];
                secondaryLines[index].push({
                    x: point.x,
                    plotX: point.plotX,
                    plotY: point[plotLine],
                    isNull: !defined(point[plotLine])
                });
            }

            pointsLength = mainLinePoints.length;
        });

        // Modify options and generate additional lines:
        each(linesApiNames, function (lineName, i) {
            if (secondaryLines[i]) {
                indicator.points = secondaryLines[i];
                if (mainLineOptions[lineName]) {
                    indicator.options = merge(
                        mainLineOptions[lineName].styles,
                        gappedExtend
                    );
                } else {
                    error(
                        'Error: "There is no ' + lineName +
                        ' in DOCS options declared. Check if linesApiNames' +
                        ' are consistent with your DOCS line names."' +
                        ' at mixin/multiple-line.js:34'
                    );
                }

                indicator.graph = indicator['graph' + lineName];
                SMA.prototype.drawGraph.call(indicator);

                // Now save lines:
                indicator['graph' + lineName] = indicator.graph;
            } else {
                error(
                    'Error: "' + lineName + ' doesn\'t have equivalent ' +
                    'in pointArrayMap. To many elements in linesApiNames ' +
                    'relative to pointArrayMap."'
                );
            }
        });

        // Restore options and draw a main line:
        indicator.points = mainLinePoints;
        indicator.options = mainLineOptions;
        indicator.graph = mainLinePath;
        SMA.prototype.drawGraph.call(indicator);
    }
};

export default multipleLinesMixin;
