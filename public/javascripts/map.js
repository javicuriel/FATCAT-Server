// create_map('world_mill');
// create_map('europe_mill');
create_map('ch_mill');
function create_map(name){
  marker_radius = 9;
  if(name != 'ch_mill'){
    marker_radius = 5;
  }
  map = new jvm.Map({
    container: $('#map'),
    map: name,
    zoomButtons : false,
    zoomOnScroll: false,
    markerStyle: {
      initial: {
          fill: 'grey',
          r: marker_radius
      }
    },
    onMarkerClick: function(event, id){
      window.location='control/'+id;
    },
    series: {
      markers: [{
        attribute: 'fill',
        stroke: '#4CAF50',
        scale:{
          'Connect': '#32CD32',
          'Disconnect': '#F44336'
        }
      }]
    },
    backgroundColor: '#f8f9fa',
    regionStyle: {
      initial: {
        fill: 'grey',
        "fill-opacity": 0.8,
        stroke: 'none',
        "stroke-width": 0,
        "stroke-opacity": 1
      },
      hover: {
        "fill-opacity": 1,
        cursor: 'pointer'
      }
    }
  });
  return map;
}

function blink_markers() {
  $('circle').each(function( index ) {
    if ($(this).css('fill') === 'rgb(50, 205, 50)'){
      $(this).fadeOut(300);
      $(this).fadeIn(300);
    }
  });
}
setInterval(blink_markers, 2000);
