var temp_chart = create_chart('#temp_chart', 'All', 1000, 0, true, ['yellow','yellow', 'red', 'red', 'blue', 'blue', 'green', 'green']);
var co2_chart = create_chart('#co2_chart', 'CO2 (ppm)', 8, 0);
var co2_press_chart = create_chart('#co2_press_chart','CO2 Press (kPa)', 100, 40);
var flow_chart = create_chart('#flow_chart', 'Flow (lpm)', 2, 0);

var control_io = io('/control');
var status_io = io('/status');

control_io.emit('recieve', deviceId);
status_io.emit('recieve', deviceId);

control_io.on('data', function (data) {
  data['timestamp'] = new Date(data.timestamp+'Z');
  add_data(co2_chart, data.timestamp, data.co2);
  add_data(co2_press_chart, data.timestamp, data.tco2);
  add_data(flow_chart, data.timestamp, data.flow);
  add_data_json(temp_chart, data);
});

status_io.on('status_update', function(instrument){
  var status_row = $("#connection_status");
  status_row.removeClass();
  status_row.addClass(instrument.connection);
  status_row.html(instrument.connection)
});


function send_command(imodule, command) {
  message = [imodule, command];
  control_io.emit('command', message);
}


function create_chart(id, label, max_y, min_y, json = false, pattern = ['yellow']){
  if(json){
    d = {'json': {}}
  }
  else{
    d = {'x': 'x', 'columns': [['x']]}
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

function add_data(chart, time, data_point) {
  chart.flow({
    columns: [
      ['x', time],
      [chart.label, data_point]
    ],
    length: 0
  });
}

function add_data_json(chart, data) {
  chart.flow({
    x: 'timestamp',
    json: [
      data
    ],
    keys: {
      x: 'timestamp',
      value: ['spoven', 'toven', 'spcoil', 'tcoil', 'spband', 'tband', 'spcat', 'tcat']
    },
    length: 0
  });
}
