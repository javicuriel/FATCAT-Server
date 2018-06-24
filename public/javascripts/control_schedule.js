
var action_types = {
  'mode': {'select': ['sampling', 'analysis']},
  'module':{'select' : ['pump','band','oven','valve','licor','extp'], 'input':'text'},
  'wait': {'select': ['seconds','minutes','hours','days'], 'input':'number'},
  'analyse':{'input':'number'}
};
actionId = 1;

function add_row(){
  var row = getRow(actionId);
  var select = getSelect(actionId);
  select.attr('onchange', 'finish_row('+actionId+', this.value)');
  for (key in action_types){
    select.append('<option value="'+key+'">'+key+'</option>');
  }
  row.append(select)
  $('#actions').append(row);
  $('#actions').append('<br>');
  actionId++;
  return row;
}

function remove_row(){
  if(actionId >= 1){
    $('#row_'+actionId).remove();
    if(actionId > 1) actionId--;
  }

}

function getRow(id) {
  return $('<div class="row input-group" id="row_'+id+'"></div>');
}
function getSelect(id) {
  var select = $('<select class="custom-select col-4" name="actions[]['+id+']" required></select>');
  var default_opt = $('<option value="">Choose...</option>');
  select.append(default_opt)
  return select;
}
function getInput(id, type){
  // TODO: Add placeholder
  var input = $('<input class="form-control col-4" type="'+type+'" name="actions[]['+id+']" required></input>');
  return input;
}
function finish_row(id, value){
  var row = $('#row_'+id);
  var children = row.children()
  for (var i = 1; i < children.length; i++) {
    children[i].remove();
  }
  if(!value) return;
  if('select' in action_types[value]){
    select = getSelect(id);
    action_types[value]['select'].forEach(function(opt){
      select.append('<option value="'+opt+'">'+opt+'</option>');
    });
    row.append(select);
  }
  if('input' in action_types[value]){
    type = action_types[value]['input'];
    input = getInput(id, type);
    row.append(input);
  }
}

function fill_edit(job){
  $('#schedule_form').attr('action','/jobs/'+job._id+'/edit');
  $("#jobId").val(job.jobId);
  $("#jobId").prop('disabled', true);
  $("#trigger").val(job.trigger[0]);
  new_option = trigger_options(job.trigger[0]);
  $(new_option.children()[0]).val(job.trigger[1]);
  if(job.trigger[0] == 'interval'){
    $(new_option.children()[1]).val(job.trigger[2]);
  }
  currentId = 1;
  job.actions.forEach(function(action){
    row = add_row();
    finish_row(currentId, action[0]);
    currentId++;
    children = row.children();
    for (var i = 0; i < children.length; i++) {
      $(children[i]).val(action[i]);
    }
  });
  $("#newJob").modal()
}

$('#newJob').on('hidden.bs.modal', function () {
  $('#schedule_form').attr('action','/jobs/add');
  $("#jobId").prop('disabled', false);
  $("#jobId").val('');
  $("#trigger").val('');
  $('#trigger_options').empty()
  $("#actions").empty();
  actionId=1;
})

function post(path, jobId){
  $.post('/jobs/'+jobId+'/'+path, function(data){
    location.reload();
  });
}

$.getJSON('/jobs?deviceId='+deviceId, function(data){
  getDataTable(data);
});


function getLabelLi(action){
  li = $('<li></li>');
  if(action[0] == 'cron'){
    li.append(prettyCron.toString(action[1]));
    return li;
  }
  for (var i = 0; i < action.length; i++) {
    li.append(action[i]);
    if(action[i] && i < action.length -1){
      li.append(':');
    }
  }
  li.append('<span class="font-weight-bold"> &#x2192 </span>');
  return li;
}



function getDataTable(data) {
  table = $('#jobs_table').DataTable();
  data.rows.forEach(function(job){
    trigger = getLabelLi(job.trigger);
    actions = $('<ul></ul>');
    job.actions.forEach((a)=>{
      actions.append(getLabelLi(a));

    });
    status = job.status.split(' ')[0];

    button_div = $('<div class="dropdown"></div>')
    button = $('<button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="fas fa-ellipsis-h"></i></button>');
    dropdown = $('<div class="dropdown-menu" aria-labelledby="dropdownMenuButton"></div>');

    if(status == 'pending'){
      dropdown.append('<a class="dropdown-item Disconnect" onclick="post(\'refreshState\', \''+job._id+'\')">Refresh state</a>');
    }else{
      dropdown.append('<a class="dropdown-item" id="'+job._id+'_edit">Edit</a>');
      if(status == 'disabled'){
        dropdown.append('<a class="dropdown-item" onclick="post(\'enable\', \''+job._id+'\')">Enable</a>');
      }
      if(status == 'scheduled'){
        dropdown.append('<a class="dropdown-item" onclick="post(\'disable\', \''+job._id+'\')">Disable</a>');
      }
      dropdown.append('<div class="dropdown-divider"></div>');

      dropdown.append('<a class="dropdown-item Disconnect" onclick="post(\'delete\', \''+job._id+'\')">Delete</a>');
    }

    button_div.append(button);
    button_div.append(dropdown);

    if(status == 'disabled'){
      status = 'Disconnect';
    }
    s = $('<span class="'+status+'"></span>');
    s.append(job.status);
    row = table.row.add([s[0].outerHTML, job.jobId, trigger.html(), actions.html(), button_div.html()]).draw( false );

    $('#'+job._id+'_edit').click(job, function(event) {
      fill_edit(event.data);
    });

  });
  return table;
}

function trigger_options(value) {
  new_option = $('');
  switch (value) {
    case 'date':
      new_option = $('#date_select').clone()
      break;
    case 'interval':
      new_option = $('#interval_select').clone()
      break;
    case 'cron':
      new_option = $('#cron_select').clone()
      break;
  }
  $('#trigger_options').empty().append(new_option);
  return new_option;
}
