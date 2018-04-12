// Status
var socket = io('/status');
socket.emit('recieve', 'all');

socket.on('status_set', function (instruments) {
    var connected = 0;
    for (id in instruments){
      set_status(id ,instruments[id].connection);
      if (instruments[id].connection == 'Connect') connected++;
    }
    $('#connected_devices').html(connected);
    $('#disconnected_devices').html(parseInt($('#total_instruments').text())-connected);
});

socket.on('status_update', function(instrument){
  set_status(instrument.id ,instrument.connection);
  update_counters(instrument.connection);
});

function update_counters(connection){
  var connected = $('#connected_devices');
  var disconnected = $('#disconnected_devices');
  if(connection == "Connect"){
    connected.html(parseInt(connected.text())+1);
    disconnected.html(parseInt(disconnected.text())-1);
  }
  else{
    connected.html(parseInt(connected.text())-1);
    disconnected.html(parseInt(disconnected.text())+1);
  }
}

function set_status(id, connection) {
  var status_row = $("#"+id+"_status_row");
  status_row.removeClass();
  status_row.addClass(connection);
  $('#instrument_table').DataTable().cell(status_row).data(connection);
  map.addMarker(id, [], [connection]);
}

$(document).ready( function () {
  $('#instrument_table').DataTable();
} );
