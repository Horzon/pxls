console.log('AutoPXLS mod by p0358, randomized pixel placement + wrong color autoadjust + stats, https://github.com/p0358/autopxls');
document.autoPxlsScriptRevision = 5;
if (!document.autoPxlsRandomNumber) document.autoPxlsRandomNumber = Math.round(Math.random() * 10000000);
//console.log('Script revision: 1, initializing...');

if (window.location.hostname == 'pxls.space') {
    if (!$("div.info").find("#autopxlsinfo").length) {
        $("div.info").append('<div id="autopxlsinfo"><h1>AutoPXLS <a href="//github.com/p0358/autopxls">mod</a>' + /* by p0358*/'</h1><p id="infoText"> </p></div>');
    }
}

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

    if (m.type == "captcha_required") {
      if (Notification.permission !== "granted")
        Notification.requestPermission();
      else {
        var notification = new Notification('autopxls', {
          body: "Hey there! Enter the captcha!",
        });
      }
      document.getElementsByTagName('title')[0].innerHTML = "[captcha!] " + document.location.hostname;
    }

    om(message);
  }
//

  var scriptRevision = document.autoPxlsScriptRevision;
  var reportStatsTimeout = 3 * 60 * 1000;

  var Painter = function(config){
    var board = document.getElementById("board").getContext('2d');
    var title = config.title || "unnamed";

    var img = new Image();
    img.crossOrigin = "anonymous";
    img.src = config.image;
    var imgsrc = config.image;
    var x = config.x;
    var y = config.y;

    var canvas = document.createElement('canvas');
    var image;

    var image_loaded_flag = false;
    var hasStartedDrawing = false;
    
    var pixels_complete = 0;
    var pixels_incomplete = 0;
    var completionPercentage = 0;

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
      
      var colornames = [
        'white',
        'lightgray',
        'gray',
        'black',
        'pink',
        'red',
        'orange',
        'brown',
        'yellow',
        'lightgreen',
        'green',
        'aqua',
        'darkblue',
        'pink',
        'magenta'
      ];

    function isSamePixelColor(coords){
      var board_pixel = board.getImageData((parseInt(x) + parseInt(coords["x"])), (parseInt(y) + parseInt(coords["y"])), 1, 1).data;
      var image_pixel = image.getImageData(coords["x"], coords["y"], 1, 1).data;

      if(image_pixel[3] <= 127) return true; // I think this line is for transparency

      var correct = true;
      for(var i = 0; i < 3; i++){
        if(board_pixel[i] != image_pixel[i]) correct = false;
      }
      if (correct === true) return true;
          else {                   
              image_pixel = nearestColor(image.getImageData(coords["x"], coords["y"], 1, 1).data, colors);
              
              for(var i = 0; i < 3; i++){
                if(board_pixel[i] != image_pixel[i]) return false;
              }
              return true;
          }
    }
    
    function nearestColor(needle, colors) {

        if (!needle) {
          return null;
        }

        var distance,
            minDistance = Infinity,
            rgb,
            value;

        for (var i = 0; i < colors.length; ++i) {
          rgb = colors[i];

          distance = Math.sqrt(
            Math.pow(needle[0] - rgb[0], 2) +
            Math.pow(needle[1] - rgb[1], 2) +
            Math.pow(needle[2] - rgb[2], 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            value = colors[i];
          }
        }

        return value;
        
    }

    function getColorId(coords){
      var pixel = image.getImageData(coords["x"], coords["y"], 1, 1).data;

      var color_id = -1;
      var flag = false;
      for(var i = 0; i < colors.length; i++){
        flag = true;
        for(var j = 0; j < 3; j++){
          if(pixel[j] != colors[i][j]){
            flag = false;
            break;
          }
        }
        if(flag){
          color_id = i;
          break;
        }
      }
      
      if (!isOptionProvided('noautocolor')) {
      
          if(color_id < 0)
            pixel = nearestColor(pixel, colors); // Pick the nearest color instead
        
          // Now just repeat the picking with the correct color
          flag = false;
          for(var i = 0; i < colors.length; i++){
            flag = true;
            for(var j = 0; j < 3; j++){
              if(pixel[j] != colors[i][j]){
                flag = false;
                break;
              }
            }
            if(flag){
              color_id = i;
              break;
            }
          }
      
      }
      
      if(color_id < 0)
        console.log("pixel at x:" + coords.x + " y: " + coords.y + " has incorrect color.");
      
      return color_id;
    }
    
    /**
     * Returns a random number between min (inclusive) and max (exclusive)
     */
    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive)
     * Using Math.round() will give you a non-uniform distribution!
     */
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function tryToDraw(scanmode){
        
      pixels_complete = 0;
      pixels_incomplete = 0;
      
      var no_more_drawing = false;
      
      var processedY = [];
      var processedX = [];
      var _y_random, _x_random;
      
      //for (var __y = 0; _y < canvas.height; __y++) {
      var _y_arr = Array.apply(null, {length: canvas.height}).map(Number.call, Number);
      var _y_arr_random = shuffle(_y_arr);
      var _x_arr = Array.apply(null, {length: canvas.width}).map(Number.call, Number);
      var _x_arr_random = shuffle(_x_arr);
      
      for (var _y = 0; _y < canvas.height; _y++) {
      //for (var _y = 0; _y < canvas.height; _y++) {
        /*_y_random = getRandomInt(0, canvas.height);
        while (processedY.includes(_y_random)) {
           _y_random = getRandomInt(0, canvas.height);
        }
        processedY.push(_y_random);*/
        _y_random = _y_arr_random[_y];
          
        for (var _x = 0; _x < canvas.width; _x++) {
          /*_x_random = getRandomInt(0, canvas.width);
           while (processedX.includes(_y_random)) {
              _x_random = getRandomInt(0, canvas.width);
           }
           processedX.push(_x_random);*/
          _x_random = _x_arr_random[_x];
            
          //var coords = {x: _x, y: _y};
          if (!isOptionProvided('classic') && !scanmode) { // yes, it still does the shuffle with classic option = it's slower, but I expect most people want the new behaviour
              var coords = {x: _x_random, y: _y_random};
          } else {
              var coords = {x: _x, y: _y};
          }

          if(isSamePixelColor(coords)){
            //console.log("same color, skip");
            pixels_complete += 1;
          }
          else{
              
            pixels_incomplete += 1;

            if (!scanmode && !no_more_drawing) {
                var color_id = getColorId(coords);
                if(color_id < 0) continue;

                console.log("drawing " + title + " coords " + " x:" + (parseInt(x) + parseInt(coords["x"])) + " y:" + (parseInt(y) + parseInt(coords["y"])) + " (" + colornames[color_id] + ")");

                App.switchColor(color_id);
                App.attemptPlace ( (parseInt(x) + parseInt(coords["x"])), (parseInt(y) + parseInt(coords["y"])) );
                //return 20;
                no_more_drawing = true;
            }
                
            
            
          }
        }
      }
      completionPercentage = Math.round( (  pixels_complete / (pixels_incomplete + pixels_complete)  ) *100 );
      if (no_more_drawing) return 20;
      if (scanmode) {
          return completionPercentage;
      }

      console.log(title + " is correct");
      return -1;
    }

    function drawImage(){
      if(image_loaded_flag){
        return tryToDraw(false);
      }
      return -1;
    }
    
    function getPixelsComplete() {
        return pixels_complete;
    }
    
    function getPixelsIncomplete() {
        return pixels_incomplete;
    }

    function isReady(){
      return image_loaded_flag;
    }

    img.onload = function(){
      canvas.width = img.width;
      canvas.height = img.height;
      image = canvas.getContext('2d');
      image.drawImage(img, 0, 0, img.width, img.height);

      image_loaded_flag = true;
    };



    return {
      drawImage: drawImage,
      isReady: isReady,
      hasStartedDrawing: hasStartedDrawing,
      title: title,
      x: x,
      y: y,
      imgsrc: imgsrc,
      tryToDraw: tryToDraw,
      getPixelsComplete: getPixelsComplete,
      getPixelsIncomplete: getPixelsIncomplete
    }
  };


  var painters = [];
  for(var i = 0; i < images.length; i++){
    painters[i] = Painter(images[i]);
  }
  
  function isOptionProvided(option) {
      if (window.location.hash.indexOf(option) !== -1) return true;
      if (document[option] == true) return true;
      return false;
  }

  function draw(){
    var timer = (App.cooldown-(new Date).getTime())/1E3;
    if(0<timer){
      if (!isOptionProvided('notimer')) {
          if (isOptionProvided('timerlite')) {
              console.log("timer: waiting...");
          } else {
              console.log("timer: " + timer);
          }
      }
      setTimeout(draw, 1000);
    }
    else{
      for(var i = 0; i < painters.length; i++){
        if(painters[i].isReady()){
          if (painters[i].hasStartedDrawing == false) {
              console.log('Starting to draw ' + painters[i].title + '!');
              painters[i].hasStartedDrawing = true;
          }
            
          var result = painters[i].drawImage();

          if(result > 0){
            //setTimeout(draw, result*1000);
            var timeout = result*1000;
            if (isOptionProvided('fast')) {
                timeout = 250;
            } else if (isOptionProvided('veryfast')) {
                timeout = 50;
            } else if (isOptionProvided('superfast')) {
                timeout = 1;
            } else switch (window.location.hostname) { // pl.pxls.cf or pxls.pety.pl - fast PXLS's, quicker than default timeout
                case 'pl.pxls.cf':
                case 'pxls.pety.pl':
                    timeout = result*100;
                    break;
            }
            setTimeout(draw, timeout);
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

  function reportStats() {
      /*if (!isReady()) {
          setTimeout(reportStats, 3000);
      } else {*/
          
      for(var i = 0; i < painters.length; i++){
        if(painters[i].isReady()){
          //var result = painters[i].drawImage();
          
          if (!document.autoPxlsRandomNumber) document.autoPxlsRandomNumber = Math.round(Math.random() * 10000000);
          
          var completionPercentage = painters[i].tryToDraw(true);
          //console.log(painters[i].title + ' completion percentage: ' + completionPercentage + '%');
          
          $.post( "https://auto.pxls.cf/report", { scriptRevision: scriptRevision, title: painters[i].title || null, x: painters[i].x || null, y: painters[i].y || null, image: painters[i].imgsrc || null, host: window.location.hostname || null, randomNumber: document.autoPxlsRandomNumber, completionPercentage: completionPercentage, pixelsComplete: painters[i].getPixelsComplete(), pixelsIncomplete: painters[i].getPixelsIncomplete() })
              .done(function( data ) {
                //alert( "Data Loaded: " + data );
                if (data.timeout) reportStatsTimeout = parseInt(data.timeout);
                if (data.logText) console.log(data.logText);
                if (data.alertText) console.log(data.alertText);
                if (data.infoText) {
                    var $el = $("div.info").find("div#autopxlsinfo").find('p#infoText');
                    if ($el.length) {
                        $el.text(data.infoText);
                    } else {
                        // Info mod doesn't exist
                    }
                }
              });
        }
      }
      
      setTimeout(reportStats, reportStatsTimeout || (3 * 60 * 1000)); // change also default value for reportStatsTimeout
  }
  
  draw();
  if (isOptionProvided('nostats')) {
      console.log('DISABLING stats reporting due to \'nostats\' option!');
  } else {
      setTimeout(reportStats, 5000);
  }
}