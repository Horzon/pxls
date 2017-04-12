


function AutoPXLS(images){
//

  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  images = shuffle(images);

// ===
  
  if (Notification.permission !== "granted")
    Notification.requestPermission();

  var om = App.socket.onmessage;

  App.socket.onmessage = function(message){
    var m = JSON.parse(message.data);

    if(m.type == "captcha_required"){
      if (Notification.permission !== "granted")
        Notification.requestPermission();
      else {
        var notification = new Notification('Notification title', {
          body: "Hey there! Enter the captcha!",
        });
      }
    }

    om(message);
  }
//



  var Painter = function(config){
    var board = document.getElementById("board").getContext('2d');
    var title = config.title || "unnamed";

    var img = new Image();
    img.crossOrigin = "anonymous";
    img.src = config.image;
    var x = config.x;
    var y = config.y;
    var mode = config.mode;
    var algo = config.algo;
    var convert = config.convert;

    var counter = [0,0];
    var total;

    var canvas = document.createElement('canvas');
    var image;

    var image_loaded_flag = false;

    var colors = [
      [255,255,255],
      [228,228,228],
      [136,136,136],
      [34,34,34],
      [255,167,209],
      [229,0,0],
      [229,149,0],
      [160,106,66],
      [229,217,0],
      [148,224,68],
      [2,190,1],
      [0,211,221],
      [0,131,199],
      [0,0,234],
      [207,110,228],
      [130,0,128]
    ];
    
    function getColorId(pixel, coords){
      if (typeof coords != "undefined" && coords != 0) pixel = image.getImageData(coords["x"], coords["y"], 1, 1).data;

      var color_id = -1;
      var flag = false;
      var score = 768;
 
      colors.forEach(function(item, i) {
        var scrnow = Math.abs(pixel[0] - item[0]) + Math.abs(pixel[1] - item[1]) + Math.abs(pixel[2] - item[2]);
        if (scrnow < score) {
          score = scrnow;
          color_id = i;
        }
      });
 
      if(color_id < 0)
        console.log("pixel at x:" + coords.x + " y: " + coords.y + " has incorrect color.");
   
      return color_id;
    }

    function isSamePixelColor(coords){
      var board_pixel = board.getImageData((parseInt(x) + parseInt(coords["x"])), (parseInt(y) + parseInt(coords["y"])), 1, 1).data;
      var image_pixel = image.getImageData(coords["x"], coords["y"], 1, 1).data;

      if(image_pixel[3] <= 127) return true;

      if(getColorId(board_pixel) != getColorId(image_pixel)) return false;
      return true;
    }

    function tryToDraw(){
      function randomInteger(min, max) {
        var rand = min - 0.5 + Math.random() * (max - min + 1)
        rand = Math.round(rand);
        return rand;
      }
      
      function doDraw(coords) {
        var color_id = getColorId(0,coords);
        
        console.log("drawing " + title + " coords " + " x:" + (parseInt(x) + parseInt(coords["x"])) + " y:" + (parseInt(y) + parseInt(coords["y"])));

        App.switchColor(color_id);
        App.attemptPlace ( (parseInt(x) + parseInt(coords["x"])), (parseInt(y) + parseInt(coords["y"])) );
        return 20;
      }
      
      if (algo == "line") {
        if (mode == "v") var edges = [canvas.width, canvas.height]
        else var edges = [canvas.height, canvas.width];

        for(var _x = 0; _x < edges[0]; _x++) {
          for(var _y = 0; _y < edges[1]; _y++) {
            if (mode == "v") var coords = {x: _x, y: _y};
            else var coords = {x: _y, y: _x};

            if(isSamePixelColor(coords)){
              //console.log("same color, skip");
            } else {
              return doDraw(coords);
            }
          }
        }
      } else while (true) {
        _x = randomInteger(0, canvas.width);
        _y = randomInteger(0, canvas.height);
        
        var coords = {x: _x, y: _y};
        
        if (counter[0] >= total || counter[1] > 50000) {
          console.log("Switching algo to line, pixcounter: " + counter[0] + "/" + total + ", repcounter: " + counter[1]);
          algo = "line";
          return 20;
        }

        if (isSamePixelColor(coords)) {
          //console.log("same color, skip");
          counter[1]++;
        } else {
          counter[0]++;
          counter[1] = 0;
          return doDraw(coords);
        } 
      }
      console.log(title + " is correct");
      return -1;
    }

    function drawImage(){
      if(image_loaded_flag){
        return tryToDraw();
      }
      return -1;
    }

    function isReady(){
      return image_loaded_flag;
    }
  };


  var painters = [];
  for(var i = 0; i < images.length; i++){
    painters[i] = Painter(images[i]);
  }

  function draw(){
    var timer = (App.cooldown-(new Date).getTime())/1E3;
    if(0<timer){
      console.log("timer: " + timer);
      setTimeout(draw, 1000);
    }
    else{
      for(var i = 0; i < painters.length; i++){
        if(painters[i].isReady()){
          var result = painters[i].drawImage();

          if(result > 0){
            setTimeout(draw, result*1000);
            return;
          }
          else{
            continue;
          }
        }
        else{
          continue;
        }
      }
      setTimeout(draw, 3000);
    }

    return;
  }

  draw();
}
