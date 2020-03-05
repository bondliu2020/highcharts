QUnit.test('Wheel scroll with middle click should hide tooltip (#11635)', function (assert) {

    var body = document.body,
        container1 = document.getElementById('container'),
        container2 = document.createElement('div');

    container1.style.position = 'absolute';
    container1.style.left = '0px';
    container1.style.top = '0px';
    container1.style.width = '400px';
    container1.style.height = '400px';
    container1.style.zIndex = 1;

    container2.setAttribute('id', 'container2');
    container2.style.position = container1.style.position;
    container2.style.left = container1.style.left;
    container2.style.top = container1.style.height;
    container2.style.width = container1.style.width;
    container2.style.height = container1.style.height;
    container2.style.zIndex = container1.style.zIndex;
    body.appendChild(container2);

    var chartOptions = {
            tooltip: {
                hideDelay: 0
            },
            series: [{
                type: 'column',
                data: [3, 2, 1]
            }]
        },
        chart1 = Highcharts.chart('container', chartOptions),
        chart2 = Highcharts.chart('container2', chartOptions);

    try {

        var controller1 = new TestController(chart1),
            controller2 = new TestController(chart2),
            point1 = chart1.series[0].points[0],
            point2 = chart2.series[0].points[0],
            point1Position = {
                x: (point1.plotX + chart1.plotLeft),
                y: (point1.plotY + chart1.plotTop)
            },
            point2Position = {
                x: (point2.plotX + chart2.plotLeft),
                y: (point2.plotY + chart2.plotTop)
            };

        assert.strictEqual(
            chart1.tooltip.isHidden,
            true,
            'Tooltip of first chart should be hidden.'
        );

        assert.strictEqual(
            chart2.tooltip.isHidden,
            true,
            'Tooltip of second chart should be hidden.'
        );

        controller1.moveTo(point1Position.x, point1Position.y);

        assert.strictEqual(
            !chart1.tooltip.isHidden,
            true,
            'Tooltip of first chart should not be hidden.'
        );

        assert.strictEqual(
            chart2.tooltip.isHidden,
            true,
            'Tooltip of second chart should be hidden. (2)'
        );

        // simulate wheel scroll effect with middle click in Chrome-based browsers
        controller1.setPosition(point1Position.x, chart1.plotHeight + point2Position.y);
        controller1.moveTo(point1Position.x, chart1.container.offsetHeight + point2Position.y);
        controller2.setPosition(point2Position.x, point2Position.y);
        controller2.moveTo(point2Position.x, point2Position.y);
        controller2.mouseDown(
            point2Position.x, point2Position.y,
            {
                button: TestController.MouseButtons.middle,
                target: controller2.relatedTarget
            }
        );

        assert.strictEqual(
            chart1.tooltip.isHidden,
            true,
            'Tooltip of first chart should be hidden. (2)'
        );

        assert.strictEqual(
            !chart2.tooltip.isHidden,
            true,
            'Tooltip of second chart should not be hidden.'
        );

    } finally {
        chart2.destroy();
        body.removeChild(container2);
    }
});
