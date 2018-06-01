// Initiate sockets
var jobs_io = io('/jobs');
jobs_io.emit('recieve', deviceId);


// On instrument status update
jobs_io.on('all', function(jobs){
  jobs['jobs'].forEach(function(job){
    data = $('<th>'+job.id+'</th>'+'<td>'+job.trigger+'</td>');
    actions = $('<td class="font-weight-light font-italic"></td>')
    job.actions.forEach(function(action){
      for (var i = 0; i < action.length; i++) {
        actions.append(action[i]);
        if(action[i] && i < action.length -1){
          actions.append(':');
        }
      }
      actions.append('<span class="font-weight-bold">-></span>');
    });
    row = $('<tr></tr>').append(data).append(actions);

    console.log(row);
    $('#jobs_table tbody').append(row);
  });
});


function append_to_row(id, row, select_name, extra) {
  select = $(select_name).clone()
  select.children().attr("name","actions[]["+id+"]");
  td = $('<td></td>').append(select);
  row.append(td);
  row.append(extra);
}

function finish_row(id, action) {
  row = update_or_create_row(id, action.value);
  switch (action.value) {
    case 'Mode':
      extra = '<td></td>'
      append_to_row(id, row, '#mode_select', extra);
      break;
    case 'Module':
      extra = '<td><input type="text" name="actions[]['+id+']" class="form-control" id="module_value" placeholder="Enter value" required></td>';
      append_to_row(id, row, '#module_select', extra);
      break;
    case 'Wait':
      extra = '<td><input type="number" name="actions[]['+id+']" class="form-control" id="wait_value" placeholder="Enter value" required></td>';
      append_to_row(id, row, '#wait_select', extra);
      break;
    case 'Analyse':
      for (var i = 0; i < 2; i++) {
        row.append($('<td></td>'));
      }
      break;
  }
}

function update_or_create_row(id, action= null) {
  if($('#row_'+id).length){
    $('#row_'+id).remove();
  }
  row = $('<tr id="row_'+id+'"><td>'+id+'</td></tr>');
  $('#action_table > tbody:last-child').append(row);
  $("#action_type_selector :first-child").attr("name","actions[]["+id+"]");
  $("#action_type_selector :first-child").attr("onchange","finish_row("+id+",this)");
  selector = $("#action_type_selector").clone();
  selector.attr("id", "selector_"+id);
  td = $('<td></td>').append(selector);
  row.append(td);
  if(action){
    $("#selector_"+id+" option:contains("+action+")").prop('selected', true)
  }
  return row;
}

function add_action() {
  id = $('#action_table tr').length;
  update_or_create_row(id);
}

function remove_action() {
  if($('#action_table tr').length > 1){
    $('#action_table tr:last').remove();
  }
}

function trigger_options(value) {
  switch (value) {
    case 'Date':
      $('#trigger_options').empty().append($('#date_select').clone());
      break;
    case 'Interval':
      $('#trigger_options').empty().append($('#interval_select').clone());
      break;
    case 'Cron':
      $('#trigger_options').empty().append($('#cron_select').clone());
      break;
  }
}
