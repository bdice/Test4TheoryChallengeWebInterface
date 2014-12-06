var T = false;

var currentAccelerator = "TOTAL";
var global_is_locked = {}; //says if an index is locked



$(document).ready(function(d){
window.isAcceleratorGridInitialized = false;

//Set up Big accel
//$.get("/big_accel.svg", function(data){
//	$("#SVG_dashboard").html($(data).find("svg")[0].outerHTML);
//});


//$.get("/small_accel.svg", function(data){
//$("#small_accel_template").html($(data).find("svg")[0].outerHTML); // Initialize the SVG of all the small accelerators
//});



data = {};

io = io.connect('https://test4theory.cern.ch',{resource:'challenge/socket.io'});
// Send the ready event.
io.emit('ready')

io.on('update', function(d) {
     d = (jQuery.parseJSON(d));
 

     currentAccelerator = "TOTAL";
     if(d[currentAccelerator] != undefined) {
     	window[currentAccelerator]["eventsCompleted"] = parseInt(d[currentAccelerator]["events"]);
     }

     var jobsFailed = 0;
     if(d[currentAccelerator]["jobs_failed"]){ 
     	jobsFailed = d[currentAccelerator].jobs_failed;
     }

     var pending = 0;
     if(d[currentAccelerator]["pending"]){
     	pending = d[currentAccelerator].pending;
     }

     var online_users = 0;
     if(d[currentAccelerator]["online_users"]){
     	online_users = d[currentAccelerator].online_users;
     }

     var monitor_machines = 0;
     if(d[currentAccelerator]["monitor_machines"]){
     	monitor_machines = d[currentAccelerator].monitor_machines;
     }
     
     var monitor_load = 0;
     if(d[currentAccelerator]["monitor_load"]){
     	monitor_load = d[currentAccelerator].monitor_load;
     }

     var monitor_alerts = 0;
     if(d[currentAccelerator]["monitor_alerts"]){
     	monitor_alerts = d[currentAccelerator].monitor_alerts;
     }

     // $("#numberOfVolunteers").html(d[currentAccelerator].totalUsers);
     // $("#totalJobs").html(d[currentAccelerator].jobs_completed);
     // $("#jobsReceived").html(d[currentAccelerator].jobs_completed - jobsFailed)
     // $("#virtualCollissionsPerSeconds").html(parseInt(d[currentAccelerator].event_rate).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "))
	
     //console.log(d);
     statusScreen.setEventRate(parseInt(d[currentAccelerator].event_rate)/10000);
     statusScreen.setLabelValue('j_completed', d[currentAccelerator].jobs_completed );
     statusScreen.setLabelValue('j_failed', jobsFailed );

     if(pending.length>0){ 
     	statusScreen.setLabelValue('j_pending', pending[0].split("_")[1]);
     	
	var pending_hist = []
	for(var i=0;i>pending.length; i++){
		console.log(pending[i])
		pending_hist.push(parseFloat(pending[i].split("_")[1]));	
	}
	console.log(pending_hist);
     }
     if(online_users.length>0){
	statusScreen.setLabelValue('v_connected', online_users[0].split("_")[1]);
     }
     if(monitor_machines.length>0){
	statusScreen.setLabelValue('i_online', monitor_machines[0].split("_")[1]);
     }
     if(monitor_load.length>0){
	statusScreen.setLabelValue('i_load', parseFloat(monitor_load[0].split("_")[1])*100 + " %" );
     }
     if(monitor_alerts.length>0){
	statusScreen.setLabelValue('i_alerts', monitor_alerts[0].split("_")[1]);
     }

	     
     //$("#data").html(JSON.stringify(d, undefined, 2));

 //    function random(count, range) {
	// 	var ans = [];
	// 	for (var i=0; i<count; i++)
	// 		ans.push(parseInt(Math.random() * range));
	// 	return ans;
	// }
     
	// var make_dataset = function(startAt, interval, data) {

	// 	// Prepare the datasets field
	// 	var fDatasets = [],
	// 		fMaxDataPoints = 0;
	// 	for (var i=0; i<data.length; i++) {

	// 		// Update maximum number of data points
	// 		if (fMaxDataPoints == 0) {
	// 			fMaxDataPoints = data[i].data.length;
	// 		} else {
	// 			if (fMaxDataPoints != data[i].data.length) {
	// 				console.error("A dataset has invalid sample count");
	// 				return;
	// 			}
	// 		}

	// 		// Extract datapoint color
	// 		var col_r = parseInt(data[i].color.substr(1,2),16),
	// 			col_g = parseInt(data[i].color.substr(3,2),16),
	// 			col_b = parseInt(data[i].color.substr(5,2),16);

	// 		// Return dataset configuration
	// 		fDatasets.push({
	// 			label: data[i].label,
	// 			fillColor: "rgba("+col_r+","+col_g+","+col_b+",0.2)",
	// 			strokeColor: "rgba("+col_r+","+col_g+","+col_b+",1)",
	// 			pointColor: "rgba("+col_r+","+col_g+","+col_b+",1)",
	// 			pointStrokeColor: "#fff",
	// 			pointHighlightFill: "#fff",
	// 			pointHighlightStroke: "rgba("+col_r+","+col_g+","+col_b+",1)",
	// 			data: data[i].data
	// 		});

	// 	}

	// 	// Return compatible dataset
	// 	return {
	// 		labels: timeseries_labels(fMaxDataPoints, startAt, interval, 1),
	// 		datasets: fDatasets
	// 	};
	// }
	
 //    statusScreen.regenPlot("jobs",
	// 		make_dataset(
	// 			Date.now()/1000,
	// 			3600,
	// 			[
	// 				{
	// 					'label': 'Random',
	// 					'color': '#428bca',
	// 					'data': random(10, 1000)
	// 				},
	// 				{
	// 					'label': 'Left',
	// 					'color': '#999999',
	// 					'data': random(10, 1000)
	// 				},
	// 				{
	// 					'label': 'Error',
	// 					'color': '#f0ad4e',
	// 					'data': random(10, 1000)
	// 				}
	// 			]
	// 		)
	// 	);
});



generateDashBoardForAccelerator(currentAccelerator, "timeline-embed" , "400px");


//Setup the lock_unlock monitor
window.setInterval(function(){

// Make jquery do the CSS work :'(
// Check later why just css is not working :'(


//Renders the state of the pureDataStore properly

$(".slider-item.locked-slide .content .content-container .text .container h3").css("display", "none");
$(".slider-item").not(".locked-slide").find(".content .content-container .text .container h3").css("display", "block");

//$(".locked-slide .content .content-container .text .container h3").css("display", "none");
//console.log(global_is_locked)

for(var i =0 ;i < window[currentAccelerator].pureDataStore.length; i++){
	var currentRecord = window[currentAccelerator].pureDataStore[i];

	//Adding exception for the first N= 3 data points(which are always unlocked)
	if(i<3){
		currentRecord.is_locked = false;
	}	

	// if the current record in pure data store looks unlocked but is actually rendered as locked
	if(!currentRecord.is_locked && global_is_locked[i]){
			//Get the respective Marker ID for the headline
			var markerId = window[currentAccelerator].INDEX_TO_MARKER_ID_MAPPING[i];

				//console.log("Unlocking....");
				//console.log(currentRecord.headline);

				//Update the Marker Text
				$("#"+markerId).find(".flag .flag-content h3").html(  currentRecord.headline  );
				try {
					//Update the Thumbnail if its not the same already.
					if($("#"+markerId).find(".flag .flag-content .thumbnail img").attr("src")!= currentRecord.asset.thumbnail){
						$("#"+markerId).find(".flag .flag-content .thumbnail img").attr("src",  currentRecord.asset.thumbnail );
					}
				} catch (err) {
					//Do nothing if one element has no thumbnail defined 
				} 

		if($(".data_"+currentAccelerator+"_"+i.toString()+" .content").length > 0) {
			
				//Remove the locked-slide class from the respective slide
				$(".data_"+currentAccelerator+"_"+i.toString()).removeClass("locked-slide");

				//Update the description too
				$(".data_"+currentAccelerator+"_"+i.toString()+" .content .content-container .text .container p").html(currentRecord.text);

				//Update the image too if its not already the same
				if($(".data_"+currentAccelerator+"_"+i.toString()+" .content .content-container .media .media-wrapper .media-container .media-image img").attr("src") != currentRecord.asset.media){
					$(".data_"+currentAccelerator+"_"+i.toString()+" .content .content-container .media .media-wrapper .media-container .media-image img").attr("src", currentRecord.asset.media);
				}


				global_is_locked[i] = false;

		}else {
			//console.log("Element doesnt exist yet !! Waiting for it to load, will then modify it !!");
		}
		
	}
}

	//update the progress bar and the unlocked state
	var dataPoint;
	var percentageComplete;
	var virtualTime;
	var startTimestamp;
	var endTimestamp;
	
	if(window[currentAccelerator].eventsCompleted != undefined){
		percentageComplete = window[currentAccelerator].eventsCompleted/window[currentAccelerator].totalEvents;
		endTimestamp = (new Date(window[currentAccelerator].endDate).getTime());
		startTimestamp = (new Date(window[currentAccelerator].startDate).getTime());

		virtualTime = startTimestamp + (endTimestamp-startTimestamp)* percentageComplete ;

		window[currentAccelerator].percentageComplete = parseInt(percentageComplete*100);
		setProgressBar(getProgress().toString(), getProgress());
		
		for(var i=0;i<window[currentAccelerator].pureDataStore.length;i++){

			if((new Date(window[currentAccelerator].pureDataStore[i].startDate)).getTime() <= virtualTime){
				window[currentAccelerator].pureDataStore[i].is_locked = false;
			}
		}

	}
		
	
},300);



});

function getProgress(){
	if(window[currentAccelerator].percentageComplete != undefined){
		return window[currentAccelerator].percentageComplete;
	} else {
		return 0;
	}
}



function generateDashBoardForAccelerator( acceleratorName, embed_id,  height){
	//Experiments with timeline.js
	$("#"+embed_id).html("");
	global_is_locked = {};
	currentAccelerator = acceleratorName;


var data = [];
var lockedData = [];

for(var i=0;i<window[acceleratorName].majorEvents.length;i++){


	data.push({
		"type" : "default",
		"startDate" : window[acceleratorName].majorEvents[i]["date"],
		"headline" : window[acceleratorName].majorEvents[i]["headline"],
		"text" : window[acceleratorName].majorEvents[i]["description"],
		"classname" : "data_"+acceleratorName+"_"+i.toString(),
		"asset" : {
			"media" : window[acceleratorName].majorEvents[i]["media"],
			"thumbnail" : window[acceleratorName].majorEvents[i]["icon"],
		},
		"is_locked" : true
	});

	lockedData.push({
		"type" : "default",
		"startDate" : window[acceleratorName].majorEvents[i]["date"],
		"headline" : window[acceleratorName].majorEvents[i]["headline"], //Keep the headline now to generate the mapping
		"text" : "This milestone will be unlocked once enough virtual events have been computed in the virtual atom smasher !!",
		"classname" : "data_"+acceleratorName+"_"+i.toString(),
		"asset" : {
			"media" : "images/icons/lock.png",
			"thumbnail" : "images/icons/Crystal_Project_Lock.png",
		}
	});
}

//Required to align the progress bar
data.push({
		"type" : "default",
		"startDate" : window[acceleratorName].startDate,
		"endDate" : window[acceleratorName].endDate,
		"headline" : acceleratorName,
		"classname" : acceleratorName+"_overallAccelerator",
		"is_locked" : true,
})

lockedData.push({
		"type" : "default",
		"startDate" : window[acceleratorName].startDate,
		"endDate" : window[acceleratorName].endDate,
		"headline" : acceleratorName,
		"classname" : acceleratorName+"_overallAccelerator",
})

var dataObject = {};
dataObject["timeline"] = {};
dataObject.timeline["headline"] = window[acceleratorName].headline;
dataObject.timeline["type"] = "default";
dataObject.timeline["text"] = window[acceleratorName].description;
dataObject.timeline["date"] = lockedData;

window[acceleratorName]["pureDataStore"] = data;

createStoryJS({
					width : "100%",
					height : height,
                    type:       'timeline',
                    source:     dataObject,
                    embed_id:   embed_id,
                });

//setProgressBar(".timeline-progress-bar", 87);

//Event Handlers for common events

var averageDelayBeforeUpdatingProgressBar = 500;
$('#timeline-embed').delegate(".vco-timeline", "LOADED", function () {
	setTimeout(addProgressBar,averageDelayBeforeUpdatingProgressBar, getProgress());

    $('#timeline-embed').delegate(".zoom-in", "click", function () {
    	setTimeout(addProgressBar,averageDelayBeforeUpdatingProgressBar, getProgress());
	});

	$('#timeline-embed').delegate(".zoom-out", "click", function () {
		  setTimeout(addProgressBar,averageDelayBeforeUpdatingProgressBar,getProgress());
	});

	//Generate the ID_to_headline mapping for markers
	var MARKER_ID_TO_HEADLINE_MAPPING = {};
	var HEADLINE_TO_MARKER_ID_MAPPING = {};
	var MARKER_ID_TO_INDEX_MAPPING = {};
	var INDEX_TO_MARKER_ID_MAPPING = {};
	$(".marker").not(".start").not("progress").each(function(){
		MARKER_ID_TO_HEADLINE_MAPPING[$(this).attr("id")] = $(this).find(".flag .flag-content h3").html();
		HEADLINE_TO_MARKER_ID_MAPPING[$(this).find(".flag .flag-content h3").html()] = $(this).attr("id");

		//Find the index in the pure data store which has the same heading
		for(var i=0;i<window[acceleratorName].pureDataStore.length;i++){
			if($(this).find(".flag .flag-content h3").html() == window[acceleratorName].pureDataStore[i].headline){
				MARKER_ID_TO_INDEX_MAPPING[$(this).attr("id")] = i;
				INDEX_TO_MARKER_ID_MAPPING[i] = $(this).attr("id");
				global_is_locked[i] = true; // update the global_is_locked key value store
			}
		}

		$(this).find(".flag .flag-content h3").html("Locked !!");
		// add the "locked-slide" class to the respective slide
		$(".data_"+acceleratorName+"_"+MARKER_ID_TO_INDEX_MAPPING[$(this).attr("id")].toString()).addClass("locked-slide");
	});
	window[acceleratorName]["MARKER_ID_TO_HEADLINE_MAPPING"] = MARKER_ID_TO_HEADLINE_MAPPING;
	window[acceleratorName]["HEADLINE_TO_MARKER_ID_MAPPING"] = HEADLINE_TO_MARKER_ID_MAPPING;
	window[acceleratorName]["MARKER_ID_TO_INDEX_MAPPING"] = MARKER_ID_TO_INDEX_MAPPING;
	window[acceleratorName]["INDEX_TO_MARKER_ID_MAPPING"] = INDEX_TO_MARKER_ID_MAPPING;
	
});
}

function setProgressBar(value) {

	$(".timeline-progress-bar .progress-bar").attr("aria-valuenow", value);
	$(".timeline-progress-bar .progress-bar").css("width", value.toString()+"%");
	$(".timeline-progress-bar .progress-bar").html(value.toString()+"%");	
	//$("#progressClip rect").attr("transform", "scale("+(value/100).toString()+",-1)")
	//$("#progressText").html(value.toString()+"%");
	statusScreen.setProgress(value);

}

function addProgressBar(value){
	var selector = ".timenav .content"
	$(".timeline-progress-bar").remove(); //remove all timeline progress bars
	$(selector).append('<div class="marker progress progress-striped active timeline-progress-bar"><div class="progress-bar" style="background-color:#2980b9" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">0%</div></div>');

	var extra_space_in_pixels = 5;
	$(".timeline-progress-bar").css("top","-"+(parseInt($(".timeline-progress-bar").css("height").replace("px",""))+extra_space_in_pixels).toString()+"px");

	setProgressBar(value);

	// The longest event-line is the marker of the accelerator start->end range !! 
	// This can be easily exploited to get the proper positioning of the progress bar without hacking Timeline.js

	var max_length = -100;
	var max_length_index = -1;
	var max_length_object = null;
	$(".event-line").each(function(index, obj){
				if(parseFloat($(this).css("width").replace("px","")) > max_length){
					max_length = parseFloat($(this).css("width").replace("px",""));
					max_length_object = obj;
				}
			}
		);

	$(".timeline-progress-bar").css("left", $(max_length_object).parent().parent().css("left"));
	$(".timeline-progress-bar").css("width", $(max_length_object).css("width"));

	

	}
