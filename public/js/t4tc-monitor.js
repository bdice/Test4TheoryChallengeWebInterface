var T = false;

var currentAccelerator = "TOTAL";
var global_is_locked = {}; //says if an index is locked



$(document).ready(function(d){
window.isAcceleratorGridInitialized = false;

/*var acceleratorList = ['CDF', 'STAR', 'UA1', 'DELPHI', 'UA5', 'ALICE', 'TOTEM', 'SLD', 'LHCB', 'ALEPH', 'LHCF', 'ATLAS', 'CMS', 'OPAL', 'D0'] ;
for(var i=0; i<acceleratorList.length;i++){
	$("#"+acceleratorList[i]).click(function(){
		currentAccelerator = $(this).attr("id").replace("accelerator_","");
		generateDashBoardForAccelerator(currentAccelerator, "timeline-embed" , "400px");
	});
}*/

//Set up Big accel
$.get("/big_accel.svg", function(data){
	$("#SVG_dashboard").html($(data).find("svg")[0].outerHTML);
});


$.get("/small_accel.svg", function(data){
$("#small_accel_template").html($(data).find("svg")[0].outerHTML); // Initialize the SVG of all the small accelerators
});



data = {};

io = io.connect();
// Send the ready event.
io.emit('ready')

// Listen for the new visitor event.
io.on('update', function(d) {
     d = (jQuery.parseJSON(d));
     //console.log(d);

     if(d[currentAccelerator] != undefined) {
     	//console.log(d);
     	window[currentAccelerator]["eventsCompleted"] = parseInt(d[currentAccelerator]["events"]);
     }

     //console.log(currentAccelerator)
     var jobsFailed = 0;
     if(d[currentAccelerator]["jobs_failed"]){ 
     	jobsFailed = d[currentAccelerator].jobs_failed;
     }
     //console.log(jobsFailed)

     $("#numberOfVolunteers").html(d[currentAccelerator].totalUsers);
     $("#totalJobs").html(d[currentAccelerator].jobs_completed);
     $("#jobsReceived").html(d[currentAccelerator].jobs_completed - jobsFailed)
     $("#virtualCollissionsPerSeconds").html(parseInt(d[currentAccelerator].event_rate).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "))


     $("#data").html(JSON.stringify(d, undefined, 2));


     if(window.isAcceleratorGridInitialized){
     	//console.log(window.isAcceleratorGridInitialized);

     }else{
     	//Initialize accelerator grid here
     	window.D = d;

     	var count = 0;
     	for(var i in d){
     		if(i=="TOTAL" || i =="Events Leaderboard" || i == "Jobs Leaderboard"){continue;}

     		//Setup a new 
     		if(count%1==0){
     			$("#accelerator_grid").append('<div class="col-lg-4"></div>');
     			//
     			//$("#accelerator_grid").append($("#small_accel_template").html());
     		}
//   		$("#accelerator_grid .col-lg-4:eq("+parseInt(count/1)+")").append($("#panel_template").html()).find(".panel-title").html(i);
     		$("#accelerator_grid .col-lg-4:eq("+parseInt(count/1)+")").append($("#panel_template").html()).attr("id", "accelName_"+i);
     		$("#accelName_"+i).find(".panel-title").html(i);
     		$("#accelName_"+i).find(".panel-body").html($("#small_accel_template").html());
     		$("#accelName_"+i).find(".accel_name").html(i);

  //	$("#accelerator_grid .col-lg-4:eq("+parseInt(count/1)+")").find(".panel-body").html();


     		count+=1;
     	}

     	window.isAcceleratorGridInitialized = true;
     }

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

	// if the current record in pure data store looks unlocked but is actually rendered as locked
	if(!currentRecord.is_locked && global_is_locked[i]){
			//Get the respective Marker ID for the headline
			var markerId = window[currentAccelerator].INDEX_TO_MARKER_ID_MAPPING[i];

				//console.log("Unlocking....");
				//console.log(currentRecord.headline);

				//Update the Marker Text
				$("#"+markerId).find(".flag .flag-content h3").html(  currentRecord.headline  );
				try {
				//Update the Thumbnail 
				$("#"+markerId).find(".flag .flag-content .thumbnail img").attr("src",  currentRecord.asset.thumbnail );
				} catch (err) {
					//Do nothing if one element has no thumbnail defined 
				} 

		if($(".data_"+currentAccelerator+"_"+i.toString()+" .content").length > 0) {
			
				//Remove the locked-slide class from the respective slide
				$(".data_"+currentAccelerator+"_"+i.toString()).removeClass("locked-slide");

				//Update the description too
				$(".data_"+currentAccelerator+"_"+i.toString()+" .content .content-container .text .container p").html(currentRecord.text);

				//Update the image too
				$(".data_"+currentAccelerator+"_"+i.toString()+" .content .content-container .media .media-wrapper .media-container .media-image img").attr("src", currentRecord.asset.media);


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
			"media" : "/images/icons/lock.png",
			"thumbnail" : "/images/icons/Crystal_Project_Lock.png",
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
	$("#progressClip rect").attr("transform", "scale("+(value/100).toString()+",-1)")
	$("#progressText").html(value.toString()+"%");
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