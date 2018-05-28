// Initiate status socket
var socket = io('/status');
socket.emit('recieve', 'all');

// On instrument status update
socket.on('status_update', function(instrument){
  set_status(instrument.id ,instrument.connection);
  update_counters(instrument.connection);
});

// Update UI counters
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

// Set class for color, update data table for quering and adding markers to map
function set_status(id, connection) {
  var status_row = $("#"+id+"_status_row");
  status_row.removeClass();
  status_row.addClass(connection);
  $('#instrument_table').DataTable().cell(status_row).data(connection);
  map.addMarker(id, [], [connection]);
}

// Initiate dataTable and link searchbar
$(document).ready( function () {
  listTable = $('#instrument_table').DataTable({
    responsive: {
      details: {
        type: 'column',
        target: 'tr'
      }
    },
  });
  new $.fn.dataTable.FixedHeader( listTable );
  $('#headerSearch').keyup(function(){
      listTable.search($(this).val()).draw() ;
  });
} );
