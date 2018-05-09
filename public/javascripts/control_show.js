var temp_chart = create_chart('#temp_chart', 'All', 1000, 0, true, ['yellow','yellow', 'red', 'red', 'blue', 'blue', 'green', 'green']);
var co2_chart = create_chart('#co2_chart', 'CO2 (ppm)', 8, 0);
var co2_press_chart = create_chart('#co2_press_chart','CO2 Press (kPa)', 100, 40);
var flow_chart = create_chart('#flow_chart', 'Flow (lpm)', 2, 0);

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

var points = 0;


control_io.on('data', function (data) {

  var displace = 0;
  points++;

  if(points > 200){
    displace = 1;
  }
  data['timestamp'] = new Date(data.timestamp+'Z');
  if (button_states != data.statusbyte){
    button_states = data.statusbyte;
    update_buttons();
  }
  // Co2_chart
  add_data(co2_chart, data.timestamp, data.co2, displace);
  // Co2_press_chart
  add_data(co2_press_chart, data.timestamp, data.tco2, displace);
  // Flow_Chart
  add_data(flow_chart, data.timestamp, data.flow, displace);
  // Temp_chart
  add_data_json(temp_chart, data, displace);
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



function create_chart(id, label, max_y, min_y, json = false, pattern = ['yellow']){
  if(json){
    d = {'json': {}, type: 'spline'}
  }
  else{
    d = {'x': 'x', 'columns': [['x']], type: 'spline'}
  }

  var da = new Date()
  var da = da.setMinutes(da.getMinutes() - 20);
  var chart = c3.generate({
      bindto: id,
      grid: {y: {show: true}},
      size: {height: 190},
      padding: {top: 20},
      point: {show: false},
      color: {
        pattern: pattern
      },
      data: d,
      axis: {
        x: {
          type: 'timeseries',
          // tick: {format: '%Y-%m-%d %H:%M:%S', culling: {max: 3}}
          tick: {format: '%Y-%m-%d %H:%M:%S'}
          // max: new Date(),
          // min: da
        },
        y: {
          max: max_y,
          min: min_y,
        }
      }
  });
  chart.label = label
  return chart
}

// function add_data(chart, time, data_point, displace = 0) {
//   time.unshift('x');
//   data_point.unshift(chart.label);
//
//   chart.flow({
//     columns: [
//       time,
//       data_point,
//     ],
//     duration: 750,
//     length: displace
//   });
// }


function add_data(chart, time, data_point, displace = 0) {
  chart.flow({
    columns: [
      ['x', time],
      [chart.label, data_point]
    ],
    // duration: duration,
    length: displace
  });
}

function add_data_json(chart, data, displace = 0) {
  chart.flow({
    x: 'timestamp',
    json: [
      data
    ],
    keys: {
      x: 'timestamp',
      value: ['spoven', 'toven', 'spcoil', 'tcoil', 'spband', 'tband', 'spcat', 'tcat']
    },
    // duration: duration,
    length: displace
  });
}
