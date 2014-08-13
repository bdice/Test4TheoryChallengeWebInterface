$(document).ready(function(d){

window.isAcceleratorGridInitialized = false;

$.get("/small_accel.svg", function(data){
$("#small_accel_template").html($(data).find("svg")[0].outerHTML); // Initialize the SVG of all the small accelerators
});

io = io.connect();
// Send the ready event.
io.emit('ready');


io.on('update', function(d) {
     d = (jQuery.parseJSON(d));

     if(window.isAcceleratorGridInitialized){
     	//console.log(window.isAcceleratorGridInitialized);

     	//update data here

     }else{
     	//Initialize accelerator grid here
     	window.D = d;

     	var count = 0;
     	for(var i in d){
     		if(i=="TOTAL" || i =="Events Leaderboard" || i == "Jobs Leaderboard"){continue;}

     		//Setup a new 
     		if(count%1==0){
     			$("#accelerator_grid").append('<div class="col-lg-3"></div>');
     		}
     		$("#accelerator_grid .col-lg-3:eq("+parseInt(count/1)+")").append($("#panel_template").html()).attr("id", "accelName_"+i);
     		$("#accelName_"+i).find(".panel-title").html(i);
     		$("#accelName_"+i).find(".panel-body").html($("#small_accel_template").html());
     		$("#accelName_"+i).find(".accel_name").html(i);

     		count+=1;
     	}
     	window.isAcceleratorGridInitialized = true;
     }

});

});

