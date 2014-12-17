$(function() {

	// Sample data
	var data = {
		labels: [ 'Mon','','','','Tue','','','','Wed' ],
		datasets:[
			{
				label: "My First dataset",
				fillColor: "rgba(151,187,205,0.2)",
				strokeColor: "rgba(151,187,205,1)",
				pointColor: "rgba(151,187,205,1)",
				pointStrokeColor: "#fff",
				pointHighlightFill: "#fff",
				pointHighlightStroke: "rgba(151,187,205,1)",
				data: [65, 59, 80, 81, 56, 55, 40, 20, 4]
			}
		]
	};

	/**
	 * Get date object from seconds since unix epoch (unix timestamp)
	 */
	function dateFromTimestamp(seconds) {
		var t = new Date(1970,0,1);
		t.setSeconds(seconds);
		return t;
	};

	function series(start, stop, step) {
		var ans = [];
		for (var i=start; i<=stop; i+=step)
			ans.push(i);
		return ans;
	}

	function random(count, range) {
		var ans = [];
		for (var i=0; i<count; i++)
			ans.push(parseInt(Math.random() * range));
		return ans;
	}


	/**
	 * Make a series of date/time labels using the specified
	 * date and interval configuration.
	 *
	 * @param count - The number of items to create
	 * @param latest - The latest date in the time series
	 * @param interval - The interval (in seconds) between the labels
	 * @param tickInterval - Every how many labels do we render the value
	 */
	var timeseries_labels = window.timeseries_labels = function(count, latest, interval, tickInterval) {
		var ans = [],
			prevDate = latest,
			prevDay = dateFromTimestamp(latest).getUTCDay();

		// Zero-pad helper
		function pad(p) { p=String(p); return ((p.length == 1) ? "0" : "") + p; };
		// Format hour helper
		function fh(d) { 
			d=dateFromTimestamp(d);
			if (d.getMinutes() == 0) {
				return d.getHours() + "h" 
			} else {
				var m = d.getMinutes().toString();
				if (m.length == 1) m = "0"+m;
				return d.getHours() + "h" + m;
			}
		};
		// Format day helper
		function fd(d) { d=dateFromTimestamp(d); return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getUTCDay()] + " " + pad(d.getDate()); }

		// Place starting label
		ans.push( fh(latest));

		// Iterate
		for (var i=0; i<count; i++) {

			// Shift interval
			var newDate = prevDate - interval,
				newDay = dateFromTimestamp(newDate).getUTCDay();

			// Check if we should show that label
			if (i % tickInterval == 0) {
				// Place label
				ans.unshift( fh(newDate) );
				// Update newDay
				prevDay = newDay;
			} else {
				ans.unshift("");
			}

			// Store previous data
			prevDate = newDate;

		}
		return ans;
	}

	/**
	 * Make a dataset compatible with Chart.js
	 *
	 * Each data object given should be under the following scheme:
	 * {
	 *	 'label': '<Dataset label>',
	 *   'color': '<Dataset color in hex>',
	 *   'data' : [ <an array of data points> ],
	 * }
	 *
	 * @param startDate - The starting date of the samples
	 * @param interval - The interval (in seconds) that was used to sample the data points
	 * @param data - An array of objects that contain information for representing the data points.
	 *
	 */
	var make_dataset = function(startAt, interval, data) {

		// Prepare the datasets field
		var fDatasets = [],
			fMaxDataPoints = 0;
		for (var i=0; i<data.length; i++) {

			// Update maximum number of data points
			if (fMaxDataPoints == 0) {
				fMaxDataPoints = data[i].data.length;
			} else {
				if (fMaxDataPoints != data[i].data.length) {
					console.error("A dataset has invalid sample count");
					return;
				}
			}

			// Extract datapoint color
			var col_r = parseInt(data[i].color.substr(1,2),16),
				col_g = parseInt(data[i].color.substr(3,2),16),
				col_b = parseInt(data[i].color.substr(5,2),16);

			// Return dataset configuration
			fDatasets.push({
				label: data[i].label,
				fillColor: "rgba("+col_r+","+col_g+","+col_b+",0.2)",
				strokeColor: "rgba("+col_r+","+col_g+","+col_b+",1)",
				pointColor: "rgba("+col_r+","+col_g+","+col_b+",1)",
				pointStrokeColor: "#fff",
				pointHighlightFill: "#fff",
				pointHighlightStroke: "rgba("+col_r+","+col_g+","+col_b+",1)",
				data: data[i].data
			});

		}

		// Return compatible dataset
		return {
			labels: timeseries_labels(fMaxDataPoints, startAt, interval, 1),
			datasets: fDatasets
		};
	}


	/**
	 * Plot with historical data
	 */
	var ChallengeHistoryChart = function(dom) {
		this.chart = new Chart(dom);
	}

	/**
	 * Define a new dataset
	 */
	ChallengeHistoryChart.addSet = function(label, color) {

	}

	/**
	 * Add data for the values
	 */
	ChallengeHistoryChart.addData = function(values) {

	}

	/**
	 * Challenge Statistics Dashboard
	 * 
	 * This class provides unified access to the messy dashboard interface
	 * with just a simple set of functions.
	 *
	 */
	var ChallengeStats = function(rootElement) {

		// Get root element
		this.R = rootElement || $(document.body);

		// Local properties
		this.eventRate = 0;
		this.maxEventRate = 100000;
		
		//// ==================================== ////
		//// Global configuration for the project ////
		//// ==================================== ////

		// Chart.js configuration
		this.chartOptions = {
			///Boolean - If to enable animation
			animation: false,
			///Boolean - Whether grid lines are shown across the chart
			scaleShowGridLines : true,
			//String - Colour of the grid lines
			scaleGridLineColor : "rgba(0,0,0,.05)",
			//Number - Width of the grid lines
			scaleGridLineWidth : 1,
			//Boolean - Whether the line is curved between points
			bezierCurve : false,
			//Number - Tension of the bezier curve between points
			bezierCurveTension : 0.4,
			//Boolean - Whether to show a dot for each point
			pointDot : true,
			//Number - Radius of each point dot in pixels
			pointDotRadius : 4,
			//Number - Pixel width of point dot stroke
			pointDotStrokeWidth : 1,
			//Number - amount extra to add to the radius to cater for hit detection outside the drawn point
			pointHitDetectionRadius : 20,
			//Boolean - Whether to show a stroke for datasets
			datasetStroke : true,
			//Number - Pixel width of dataset stroke
			datasetStrokeWidth : 2,
			//Boolean - Whether to fill the dataset with a colour
			datasetFill : true,
			//String - The tooltip text
			tooltipTemplate: "<%= value %>",
		};

		// JustGauge.js configuration
		this.justGaugeOptions = {
			// No refresh animation
			refreshAnimationTime: 0,
			//Boolean - Hide inner shadow
			hideInnerShadow: true,
			hideMinMax: true,
			// Format numbers with commas
			formatNumber: false,
			decimals: 0,
		};

		//// ===================================================== ////
		//// Get references to varous elements used by the project ////
		//// ===================================================== ////

		// Gauges
		this.eGaugeEventRate = this.R.find("#gauge-events");
		this.eGaugeProgress = this.R.find("#gauge-progress");

		// Chart plots
		this.eServiceCharts = {
			'volunteers': this.R.find("#chart-volunteers"),
			'jobs'		: this.R.find("#chart-jobs"),
			'infr'		: this.R.find("#chart-infr"),
		};

		// Log label
		this.eLogDate = this.R.find("#tweet-date");
		this.eLogText = this.R.find("#tweet-text");

		// Colored labels
		this.eServiceLabel = {
			'global' 	: this.R.find("#status-global"),
			'volunteers': this.R.find("#status-volunteers"),
			'jobs'		: this.R.find("#status-jobs"),
			'infr'		: this.R.find("#status-infr"),
		};

		// Status labels
		this.eStatusLabels = {

			// Volunteer labels
			'v_connected'  	: this.R.find("#service-volunteers .lbl-connected"),
			'v_newcomers'   : this.R.find("#service-volunteers .lbl-newcomers"),
			'v_achievements': this.R.find("#service-volunteers .lbl-achievements"),

			// Jobs labels
			'j_pending'	   	: this.R.find("#service-jobs .lbl-pending"),
			'j_completed'    	: this.R.find("#service-jobs .lbl-completed"),
			'j_failed'	   	: this.R.find("#service-jobs .lbl-failed"),

			// Infrastructure labels
			'i_online'	   	: this.R.find("#service-infr .lbl-online"),
			'i_load' 	   	: this.R.find("#service-infr .lbl-load"),
			'i_alerts'	   	: this.R.find("#service-infr .lbl-alerts"),

		};

		//// =========================== ////
		//// Initialize Chart.js charts  ////
		//// =========================== ////

		// Empty dataset
		this.emptyDataSet = {
			labels: [ '','' ],
			datasets: [{
				label: "Empty Dataset",
				data: [ 0, 0]
			}]
		};

		//// =========================== ////
		//// Initialize justGauge gauges ////
		//// =========================== ////
		
		// Left-side gauge: Event rate
		this.gEventRate = new JustGage($.extend({}, this.justGaugeOptions, {
			parentNode: this.eGaugeEventRate.get(0),
			value: 0,
			min: 0,
			max: this.maxEventRate ,
			levelColors: [ '#666666' ],
			formatNumber: true,
			title: "EVENTS PER SECOND",
			label: "",
			labelMinFontSize: 14
		}));

		// Right-side gauge: Progress
		this.gProgress = new JustGage($.extend({}, this.justGaugeOptions, {
			parentNode: this.eGaugeProgress.get(0),
			value: 0,
			min: 0,
			max: 100,
			levelColors: [ '#5cb85c' ],
			titleFontColor: '#3c763d',
			title: "PROGRESS",
			label: "%",
			labelMinFontSize: 14,
			decimals: 2
		}));

		// Perform initial update
		this.update();

	}

	/**
	 * Set status & optionally the text of a colored label
	 */
	ChallengeStats.prototype.setServiceStatus = function(label, status, text) {
		// Update class
		this.eServiceLabel[label].removeClass('c-success c-warning c-danger c-primary')
						   		 .addClass('c-'+status);		
		// Update text
		if (text) this.eServiceLabel[label].text(text);
	}

	/**
	 * Update the event rate in the live display
	 */
	ChallengeStats.prototype.updateLiveProgressBar = function() {
		var prog = $('#live-progress'),
			p_value = prog.find('.value'),
			p_ind1 = prog.find('.indicator.first'),
			p_ind2 = prog.find('.indicator.second'),
			p_ind3 = prog.find('.indicator.third');

		var v = this.eventRate;
		if (v > this.maxEventRate) v = this.maxEventRate;
		p_value.css({ 'width': (100 * v / this.maxEventRate) + '%' });

		var v1 = 3000;
		p_ind1.css({ 'left': (100 * v1 / this.maxEventRate).toFixed(2) + '%' });
		var v2 = 100000;
		p_ind2.css({ 'left': (100 * v2 / this.maxEventRate).toFixed(2) + '%' });
		var v3 = 0;
		p_ind3.css({ 'left': (100 * v3 / this.maxEventRate).toFixed(2) + '%' });

	}


	/**
	 * Set status of a colored label
	 */
	ChallengeStats.prototype.setGlobalStatus = function(status, text) {

		// Change class of global header
		this.setServiceStatus("global", status, text);

		// Mapping between name and foreground/background color
		var b_colors = {
				'success': '#5cb85c',
				'warning': '#f0ad4e',
				'danger': '#d9534f',
				'primary': '#428bca'
			},
			f_colors = {
				'success': '#3c763d',
				'warning': '#8a6d3b',
				'danger': '#a94442',
				'primary': '#428bca'
			};

		// Update gauge colors
		this.gProgress.config.levelColors[0] = b_colors[status];
		this.gProgress.txtTitle.attr({ 'fill': f_colors[status] });
		this.gProgress.refresh( this.gProgress.config.value );

	}

	/**
	 * Set log feed
	 */
	ChallengeStats.prototype.setLogMessage = function(date, text) {

		// Zero-pad helper
		function pad(p) { p=String(p); return ((p.length == 1) ? "0" : "") + p; };

		// Update date
		var date = new Date(date);
		this.eLogDate.text("[" + pad(date.getDate()) + "/" + pad(date.getMonth()) + "/" + pad(date.getFullYear()) + " " +
						         pad(date.getHours()) + ":" + pad(date.getMinutes()) + "]");

		// Update text
		this.eLogText.text(text);

	}

	/**
	 * Set label value with optional small sub-value
	 */
	ChallengeStats.prototype.setLabelValue = function(name, number, smallValue) {
		// Convert to number with thousands separator
		if (!number) number="--";
		var htmlValue = number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		// Check if we have to add a small value
		if (smallValue) htmlValue += " <small>" + smallValue + "</small>";
		// Update label
		this.eStatusLabels[name].html(htmlValue);
	}

	/**
	 * Set event rate
	 */
	ChallengeStats.prototype.setEventRate = function(number) {
		this.gEventRate.refresh(number);
		var num = parseInt(number) ;

		// Convert with comma
		var htmlValue = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		$("#live-events").text(' '+htmlValue+' ');

		// Update progress bar event rate
		this.eventRate = num;
		this.updateLiveProgressBar();
	}

	/**
	 * Set progress
	 */
	ChallengeStats.prototype.setProgress = function(number) {
		this.gProgress.refresh(number);
	}

	/**
	 * Regenerate plot
	 */
	ChallengeStats.prototype.regenPlot = function(name, dataset, interval) {

		// Config
		var config = {
			lines: {
				show: true
			},
			points: {
				show: true
			},
			yaxes: [
				{
					tickDecimals: 0,
				},
				{
					position: "right",
					tickDecimals: 0,
				},
			],
			xaxis: {
				tickDecimals: 0,
				tickSize: interval,
				tickFormatter: function(v) {
					var d = new Date(v);
					return d.getHours()+"h";
				}
			},
			grid: {
				borderWidth: 0,
				//hoverable: true
			},
			/**
			tooltip: true,
			tooltipOpts: {
			   content: function(label, xval, yval, flotItem){
			       return "<b>"+yval+"</b>";
			   },
			   shifts: {
			     x: -30,
			     y: -50
			   }
		       }
			**/
		};

		if(name=="volunteers"){
			config.legend = {
				container: $("#chart-volunteers-legend")
			}
		}else if(name=="jobs"){
			config.legend = {
				container: $("#chart-jobs-legend")
			}		
		}
		// Regen flot
		$.plot(this.eServiceCharts[name], dataset, config);

	}

	/**
	 * Set plot dataset
	 */
	ChallengeStats.prototype.updatePlotDatasets = function(plot, dataInterval, datasets) {

		// Interval is in ms
		var interval = dataInterval * 1000;

		// Preate the x/y pairs for each dataset
		for (var i=0; i<datasets.length; i++) {
			var samples = datasets[i].data, data=[],
				time = (new Date()).getTime(); 

			// Make it full multiplicants of interval
			time = Math.round(time / interval) * interval;

			// Generate [x,y] pair
			for (var j=0; j<samples.length; j++) {
				data.unshift([time, samples[j]]);
				time -= interval;
			}

			// Emplace to data
			datasets[i].data = data;
		}

		// Regenerate plot
		this.regenPlot(	plot, datasets, interval );

	}

	/**
	 * Update screen status
	 */
	ChallengeStats.prototype.update = function() {

		// Set all color labels to blue/Checking
		this.setGlobalStatus ("primary", "CHECKING");
		this.setServiceStatus("volunteers", "success", "LIVE");
		this.setServiceStatus("jobs", "success", "LIVE");
		this.setServiceStatus("infr", "success", "LIVE");

		// Set progress to zero
		this.setProgress(0);
		this.setEventRate(0);

		// Reset all labels
		this.setLabelValue('v_connected', '0');
		this.setLabelValue('v_newcomers', '0', '/h');
		this.setLabelValue('v_achievements', '0', '/0');
		this.setLabelValue('j_pending', '0');
		this.setLabelValue('j_failed', '0');
		this.setLabelValue('i_online', '0', '/0');
		this.setLabelValue('i_load', '0 %');
		this.setLabelValue('i_alerts', 'None');

		// Add twitter log
		this.setLogMessage( Date.now(), "This is a test" );

		// Add some random datasets
		/*
		this.regenPlot("volunteers",
			make_dataset(
				Date.now()/1000,
				3600,
				[
					{
						'label': 'Connected',
						'color': '#428bca',
						'data': random(10, 1000)
					},
					{
						'label': 'Newcomers',
						'color': '#3c763d',
						'data': random(10, 1000)
					}
				]
			)
		);
		this.regenPlot("jobs",
			make_dataset(
				Date.now()/1000,
				3600,
				[
					{
						'label': 'Random',
						'color': '#428bca',
						'data': random(10, 1000)
					},
					{
						'label': 'Left',
						'color': '#999999',
						'data': random(10, 1000)
					},
					{
						'label': 'Error',
						'color': '#f0ad4e',
						'data': random(10, 1000)
					}
				]
			)
		);
		this.regenPlot("infr",
			make_dataset(
				Date.now()/1000,
				3600,
				[
					{
						'label': 'Random',
						'color': '#428bca',
						'data': random(10, 1000)
					}
				]
			)
		);
		*/

	}

	window.statusScreen = new ChallengeStats();

	// Update error broadcasts on the main UI
	var update_errors = function() {
		$.get("//test4theory.cern.ch/broadcast.json", function(d) {
			if (d.message) {
				$("#warning-panel").text(d.message);
				$("#warning-panel").show();
			} else {
				$("#warning-panel").hide();
			}
		}, "json");
	};
	setTimeout(update_errors, 30000);
	update_errors();

});
