$('.smoothie-chart').attr('width', $('#dashboard_column').width());
$( window ).resize(function() {
  $('.smoothie-chart').attr('width', $('#dashboard_column').width() );
});

temp_line_colors = ['yellow','yellow','red','red','blue','blue','green','green'];
temp_line_names = ['spoven', 'toven', 'spcoil', 'tcoil', 'spband', 'tband', 'spcat', 'tcat'];

var temp_chart = init_chart('temp_chart', get_line_options(temp_line_colors, temp_line_names) , 0, 1000);
var co2_chart = init_chart('co2_chart', get_line_options(['yellow'],['co2']), 0, 8);
var co2_press = init_chart('co2_press_chart', get_line_options(['yellow'],['tco2']), 40, 100);
var flow = init_chart('flow_chart', get_line_options(['yellow'],['flow']), 0 , 2);

var control_io = io('/control');
var status_io = io('/status');

// VALVE_Bit8, , PUMP_Bit7, FAN_Bit6, OVEN_Bit5,
// BAND_Bit4, LICOR_Bit3, EXTP_Bit2, Bit1_reserve

var button_states;
var buttons = ['valve','pump','fan','oven','band','licor','extp']

control_io.emit('recieve', deviceId);
status_io.emit('recieve', deviceId);

$('.toggle_wrapper').click(function(e){
    e.stopPropagation();
});

function send_command(imodule) {
  if ($('.lock').hasClass('fa-lock-open')){
    button_state = $('#'+imodule).prop('checked');
    if(button_state) command = 'off';
    else command = 'on';
    message = [imodule, command];
    control_io.emit('command', message);
  }
}

function update_buttons() {
  binary_states = parseInt(button_states,16).toString(2);
  console.log(binary_states);
  for (var i in binary_states) {
    bool = Boolean(Number(binary_states[i]));
    $('.'+buttons[i]).prop('checked', bool).change();
  }
}


control_io.on('data', function (data) {
  if (button_states != data.statusbyte){
    button_states = data.statusbyte;
    update_buttons();
  }
  // // Temp_chart
  for (var i = 0; i < temp_line_names.length; i++) {
    temp_chart.seriesSet[i].timeSeries.append(data.timestamp, data[temp_line_names[i]]);
  }
  // // Co2_chart
  co2_chart.seriesSet[0].timeSeries.append(data.timestamp, data.co2);
  // // Co2_press_chart
  co2_press.seriesSet[0].timeSeries.append(data.timestamp, data.tco2);
  // // Flow_Chart
  flow.seriesSet[0].timeSeries.append(data.timestamp, data.flow);
});

status_io.on('status_update', function(instrument){
  var status_row = $("#connection_status");
  status_row.removeClass();
  status_row.addClass(instrument.connection);
  status_row.html(instrument.connection)
});

function lock(){
  if ($('.lock').hasClass('fa-lock')){
    $('.lock').removeClass('fa-lock')
    $('.lock').addClass('fa-lock-open')
    $('input:checkbox').bootstrapToggle('enable')
    console.log($('input:checkbox'));
  }
  else{
    $('.lock').removeClass('fa-lock-open')
    $('.lock').addClass('fa-lock')
    $('input:checkbox').bootstrapToggle('disable')
  }
}



function init_chart(id, options, min, max) {
  var chart = new SmoothieChart({maxValue:max, minValue:min, millisPerPixel: 80,tooltip:true ,grid: { strokeStyle: '#555555', lineWidth: .5, millisPerLine: 10000, verticalSections: 4 }});
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
