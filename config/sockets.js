module.exports = function (io, instruments, pubsub){
  var reload = io.of('/reload');
  var control = io.of('/control');
  var status = io.of('/status');

  var module = {control , status, reload};

  control.on('connection', function(socket){

    socket.on('recieve', function (room) {
      instruments.validate_id(room, () =>{
        connect_socket(socket, room, () => {
          instruments.add_request_device_data(room, pubsub);
        });
      });
    });

    socket.on('command', function (data) {
      if(socket.room){
        pubsub.publishDeviceCommand("instrument", socket.room, data[0], "txt", data[1]);
      }
    });

    socket.on('disconnect', function (reason) {
      console.log("Disconnected "+ reason);
      room = socket.room;
      disconnect_socket(socket, ()=> {
        instruments.delete_request_device_data(room, pubsub);
      });
    });
  });


  status.on('connection', function(socket){
    socket.on('recieve', function (room) {

      connect_socket(socket, room, () => {
        if (room == 'all'){
          status.to('all').emit('status_set', instruments);
        }
      });
    });

    socket.on('disconnect', function(room){
      disconnect_socket(socket);
    });

  });

  var connect_socket = function(socket, room, success_callback){
    // One socket can only be connected to one room therefore
    // Disconnect from previous connections
    disconnect_socket(socket);
    socket.room = room;
    socket.join(room);
    success_callback();
  }

  var disconnect_socket = function(socket, success_callback = ()=>{}){
    if(socket.room){
      socket.leave(socket.room);
      socket.room = null;
      success_callback();
    }
  }
  return module;

};
