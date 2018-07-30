// Temperature chart
temp_line_colors = ['yellow','yellow','red','red','blue','blue','green','green'];
temp_line_names = ['spoven', 'toven', 'spcoil', 'tcoil', 'spband', 'tband', 'spcat', 'tcat'];

// Initiate charts
var temp_chart = init_chart('temp_chart', get_line_options(temp_line_colors, temp_line_names), 0, 1000);
var co2_chart = init_chart('co2_chart', get_line_options(['yellow'],['co2']));
var co2_press = init_chart('co2_press_chart', get_line_options(['yellow'],['pco2']), 40, 100);
var flow = init_chart('flow_chart', get_line_options(['yellow'],['flow']), 0 , 2);

// Fill Historic data
$.getJSON(deviceId+"/getData", function(result){
  result.docs.forEach(function(datum){
    datum.data.timestamp = new Date(datum.data.timestamp).getTime()
    appendData(datum.data);
  });
});

// Initiate sockets
var control_io = io('/control');
var status_io = io('/status');
control_io.emit('recieve', deviceId);
status_io.emit('recieve', deviceId);

// VALVE_Bit8, , PUMP_Bit7, FAN_Bit6, OVEN_Bit5,
// BAND_Bit4, LICOR_Bit3, EXTP_Bit2, Bit1_reserve
var button_states;
var buttons = ['valve','pump','fan','oven','band','licor','extp']

// Stop Propagation because state should be controled by status byte
$('.toggle_wrapper').click(function(e){
    e.stopPropagation();
});

// Send command if unlocked
function send_command(imodule, mode = false) {
  if ($('.lock').hasClass('fa-lock-open')){
    button_state = $('#'+imodule).prop('checked');
    command = 'on';
    if(!mode){
      if(button_state) command = 'off';
    }
    message = [imodule, command];
    control_io.emit('command', message);
  }
}


// Parse state to binary, add missing zeros and update buttons
function update_buttons() {
  binary_states = parseInt(button_states,16).toString(2);
  extra_zeros = 8 - binary_states.length;
  // Add extra zeros
  for (var i = 0; i < extra_zeros; i++) {
    binary_states = '0' + binary_states;
  }
  for (var i in binary_states) {
    bool = Boolean(Number(binary_states[i]));
    $('#'+buttons[i]).prop('checked', bool).change();
  }
}

// On new data, append points to charts
control_io.on('data', function (data) {
  // Update buttons state only if changed
  if (button_states != data.statusbyte){
    button_states = data.statusbyte;
    update_buttons();
  }
  appendData(data);
});

// Update status
status_io.on('status_update', function(instrument){
  var status_row = $("#connection_status");
  status_row.removeClass();
  status_row.addClass(instrument.connection);
  status_row.html(instrument.connection)
});

function appendData(data) {
  // Temp_chart: for each line in graph
  for (var i = 0; i < temp_line_names.length; i++) {
    temp_chart.seriesSet[i].timeSeries.append(data.timestamp, data[temp_line_names[i]]);
  }
  // // Co2_chart
  co2_chart.seriesSet[0].timeSeries.append(data.timestamp, data.co2);
  // // Co2_press_chart
  co2_press.seriesSet[0].timeSeries.append(data.timestamp, data.pco2);
  // // Flow_Chart
  flow.seriesSet[0].timeSeries.append(data.timestamp, data.flow);
}

// Animate lock
function lock(){
  if ($('.lock').hasClass('fa-lock')){
    $('.lock').removeClass('fa-lock')
    $('.lock').addClass('fa-lock-open')
    $('.toggle').addClass('enabled')
    $('.toggle').removeClass('disabled')
    $('.btn').removeClass('disabled')
  }
  else{
    $('.lock').removeClass('fa-lock-open')
    $('.lock').addClass('fa-lock')
    $('.toggle').addClass('disabled')
    $('.toggle').removeClass('enabled')
    $('.btn').addClass('disabled')
  }
}

// Init charts
function init_chart(id, options, min = null, max = null) {
  chart_options = {
    maxValueScale:1.5,
    minValueScale:1.5,
    millisPerPixel: 80,
    tooltip:true ,
    grid: { strokeStyle: '#555555', lineWidth: .5, millisPerLine: 5000, verticalSections: 4}
  }
  if(min != null){
    chart_options.minValue = min;
    chart_options.maxValue = max;
  }

  var chart = new SmoothieChart(chart_options)
  var dataSets = [];
  for (var i = 0; i < options.length; i++) {
    dataSets.push(new TimeSeries());
  }
  for (var i = 0; i < options.length; i++) {
    chart.addTimeSeries(dataSets[i], options[i]);
  }
  // Delay
  chart.streamTo(document.getElementById(id), 1000);
  canvas = document.getElementById(id);
  var ctx = canvas.getContext('2d');
  return chart;
}

// Set line options and colors
function get_line_options(colors, names) {
  lineWidth = 1.5;
  options = [];
  for (var i = 0; i < colors.length; i++) {
    dashed = false;
    if(names[i][0] == 's'){
      dashed = true;
    }
    option = { strokeStyle: colors[i], name: names[i], lineWidth: lineWidth, dashed: dashed };
    options.push(option);
  }
  return options;
}

// Change controls positions on resize
function controls_ui_placement() {
  if ($(window).width() <= 992) {
    $('#controls_card').append($("#controls"));
  }
  else {
    $('#controls_sidebar').append($("#controls"));
  }
}

$(document).ready( function () {
  $('.smoothie-chart').attr('width', $('#dashboard_column').width());
  controls_ui_placement();
  lock();
});

$(window).on('resize', function(){
  controls_ui_placement();
  // Chart resizing done manually because auto was not working
  $('.smoothie-chart').attr('width', $('#dashboard_column').width());
});
