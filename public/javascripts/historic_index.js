var graphDiv = document.getElementById('graph');

var x_start, x_end;

var dataTable, data;

start_date = moment().subtract(29, 'days');
end_date  = moment();

$('#datepicker').datepicker({
  uiLibrary: 'bootstrap4',
  format: 'yyyy-mm-dd'
});

function download_csv(){
  deviceId = $('#instrument_select').val();
  date = $('#datepicker').val();
  filename = 'raw_data_'+deviceId+'_'+ moment(date).format('YYYY_MM_DD')+'.csv';
  if (!deviceId || !date) return;
  link = document.createElement('a');
  link.setAttribute('href', '/historic/raw_data?deviceId='+deviceId+'&date='+date+'');
  link.setAttribute('download', filename);
  link.click();
}


$.getJSON('/instruments/', function(instruments){
  select = $("#instrument_select");
  instruments.results.forEach(function(instrument){
    select.append('<option>'+instrument.deviceId+'</option>');
  });
  if(instruments.results.length == 1){
    $("#instrument_select").val(instruments.results[0].deviceId);
    load_page(instruments.results[0].deviceId);
  }
  $('#loading_screen').css('display','none');
  $('#page_div').css('display','block');


});

function hide_pickers(data_type) {
  if(data_type == 'analysis'){
    $('#datepickerdiv').css('display','none');
    $('#daterange').css('display','block');
    $('#download_button').css('display','none');
  }
  else if(data_type == 'raw'){
    $('#daterange').css('display','none');
    $('#datepickerdiv').css('display','block');
    $('#download_button').css('display','block');
  }
}

function load_page(){
  deviceId = $('#instrument_select').val();
  data_type = $('#data_type_select').val();
  hide_pickers(data_type);
  if(!deviceId) return;
  if(data_type == 'analysis'){
    getData(deviceId, start_date.format('YYYY-MM-DD'), end_date.format('YYYY-MM-DD'), function(jsonData) {
      data = jsonData;
      $('#data_div').css('display','block');
      dataTable = getDataTable(jsonData);
      setDataGraph(formatData(jsonData));
      update_averages();
    });
  }
}

function update_averages(){
  total_carbon = baseline = max_temp = count = 0;

  data.rows.forEach(function(row){
    if(isBetweenDates(row.timestamp)){
      count++;
      total_carbon += row.total_carbon;
      baseline += row.baseline;
      max_temp += row.max_temp;
    }
  });
  total_carbon /= count;
  baseline /= count;
  max_temp /= count;

  $('#deviceId').html($("#instrument_select").val());
  $('#total_carbon').html(total_carbon.toFixed(1));
  $('#baseline').html(baseline.toFixed(1));
  $('#max_temp').html(max_temp.toFixed(1));

}


function cb(start, end) {
    $('#daterange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
}

$('#daterange').daterangepicker({
    startDate: start_date,
    endDate: end_date,
    ranges: {
       'Today': [moment(), moment()],
       'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
       'Last 7 Days': [moment().subtract(6, 'days'), moment()],
       'Last 30 Days': [moment().subtract(29, 'days'), moment()],
       'This Month': [moment().startOf('month'), moment().endOf('month')],
       'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
    }
}, cb);

cb(start_date, end_date);


$('#daterange').on('apply.daterangepicker', function(ev, picker) {
  start_date = picker.startDate;
  end_date = picker.endDate;
  load_page($("#instrument_select").val());
});


function getDataTable(data) {
  return $('#data_table').DataTable( {
    destroy: true,
    data: data.rows,
    columns: [
        { data: 'timestamp', visible: false},
        { data: 'timestamp', target: 1 ,render: function(data){return moment(data).format('MMMM Do YYYY, h:mm:ss a')}},
        { data: 'deviceId' },
        { data: 'total_carbon', render: function(data){return data.toFixed(2)} },
        { data: 'max_temp'},
        { data: 'baseline', render: function(data){return data.toFixed(2)} },
        { data: '_id', target: 1, render: function(id){return '<a href="historic/show/'+id+'">Show</a>'}},
        { data: 'timezone', visible: false}
    ],
    "order": [[ 0, "desc" ]],
    dom: 'Bfrtip',
    buttons: [
            'copy', 'csv', 'print'
        ]
  });
}


function formatData(data) {
  total_carbon = {
    name:'(ug) Total Carbon',
    type: 'scatter',
    mode: 'lines+markers',
    line: {shape: 'spline'},
    x:[],
    y:[]
  };
  max_temp = {
    name:'(degC) Max Temperature',
    type: 'scatter',
    yaxis: 'y2',
    mode: 'lines',
    line: {shape: 'hv', color: 'red'},
    x:[],
    y:[]
  };
  baseline = {
    name:'(ppm) Baseline',
    type: 'scatter',
    mode: 'lines',
    line: {shape: 'hv', color: 'grey', dash:'dash'},
    x:[],
    y:[]
  };
  data.rows.forEach(function(datum){
    date = new Date(datum.timestamp);
    total_carbon.x.push(date);
    max_temp.x.push(date);
    baseline.x.push(date);
    total_carbon.y.push(datum.total_carbon);
    max_temp.y.push(datum.max_temp);
    baseline.y.push(datum.baseline);
  });
  if(data.rows.length == 0){
    return [];
  }
  return [total_carbon, max_temp, baseline]
}
function getData(deviceId, start, end, callback){
  $.getJSON("historic/data?deviceId="+deviceId+"&from="+start+"&to="+end, function(response){
    callback(response);
  });
}



function setDataGraph(data) {
  m = 20;
  var layout = {
    height: 500,
    margin: {
      b: m,
      t: m
    },
    showlegend: true,
	  legend: {x: 0,y: 1.2,"orientation": "h"},
    xaxis: {
        rangeslider: {},
        hoverformat: "%y.%m.%d %I:%M %p"
    },
    yaxis: {title: 'CO2'},
    yaxis2: {
      title: 'Temperature',
      overlaying: 'y',
      rangemode:'tozero',
      autorange: true,
      side: 'right'
    }
  };

  Plotly.newPlot(graphDiv, data, layout);
  // On slider change range
  graphDiv.on('plotly_relayout',function(eventdata){
    if(eventdata['xaxis.range']){
      x_start = eventdata['xaxis.range'][0]
      x_end = eventdata['xaxis.range'][1]
      $('#data_table').DataTable().draw();
      update_averages();
    }
  });

}

function isBetweenDates(time) {
  if ( ( isNaN( x_start ) && isNaN( x_end ) ) ||
       ( isNaN( x_start ) && time <= x_end ) ||
       ( x_start <= time   && isNaN( x_end ) ) ||
       ( x_start <= time   && time <= x_end ) )
  {
      return true;
  }
  return false;
}


$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
        var time = parseFloat( data[0] ) || 0;
        return isBetweenDates(time);
    }
);
