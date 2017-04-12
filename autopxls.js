function AutoPXLS(images, cooldown, debug){
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
    
    function doDeltaEConvertion() {
      console.log('Converting image, this may take up to 30 seconds.');
      
      var tmpPArr = [];
      
      function rgb2lab(r, g, b) {
        var refX =  95.047,
            refY = 100.000,
            refZ = 108.883;
          
        r /= 255
        g /= 255
        b /= 255
      
        if (r > 0.04045) r = Math.pow(((r + 0.055) / 1.055), 2.4)
        else r = r / 12.92
      
        if (g > 0.04045) g = Math.pow(((g + 0.055) / 1.055), 2.4)
        else g = g / 12.92
      
        if (b > 0.04045) b = Math.pow(((b + 0.055) / 1.055), 2.4)
        else b = b / 12.92
      
        r = r * 100; g = g * 100; b = b * 100;
        
        var x = r * 0.4124 + g * 0.3576 + b * 0.1805,
            y = r * 0.2126 + g * 0.7152 + b * 0.0722,
            z = r * 0.0193 + g * 0.1192 + b * 0.9505;
      
        x /= refX
        y /= refY
        z /= refZ
      
        if (x > 0.008856) x = Math.pow(x, 1/3)
        else x = 7.787 * x + 16 / 116
        if (y > 0.008856) y = Math.pow(y, 1/3)
        else y = 7.787 * y + 16 / 116
        if (z > 0.008856) z = Math.pow(z, 1/3)
        else z = 7.787 * z + 16 / 116
      
        return {
          L: (116 * y) - 16,
          A: 500 * (x - y),
          B: 200 * (y - z)
        }
      }
      
      function normColor(r, g, b) {
        var num = 0,
            scr = 1024,
            lab1 = rgb2lab(r, g, b);
        
        //console.log ('R: ', r, ' G: ', g, ' B: ', b);
        
        colors.forEach(function(item, index, array) {
            var lab2 = rgb2lab(item[0], item[1], item[2]),
                deltaE = new dE00(lab1, lab2),
                curscr = deltaE.getDeltaE();
            
            if (curscr < scr) {
                scr = curscr;
                num = index;
            };
            
            //console.log (lab1, lab2);
        });
        
        return colors[num];
      }

      for (var y = 0; y < canvas.height; y++) {
          var newStr = [];
          //newStr[-1] = [255, 255, 255]; //Костыль
            
            for (var x = 0; x < canvas.width; x++) {
                var pixel = image.getImageData(x, y, 1, 1).data,
                    r = pixel[0],
                    g = pixel[1],
                    b = pixel[2],
                    a = pixel[3];
                    
              newStr[x] = [r, g, b, a];
          }
            
          tmpPArr.push(newStr);
      }
      console.log("Converted in. Now dithering.");
      
      for (var y = 0; y < canvas.height; y++) {
          for (var x = 0; x < canvas.width; x++) {
            if (tmpPArr[y][x][3] >= 128) {
              var rc = normColor(tmpPArr[y][x][0], tmpPArr[y][x][1], tmpPArr[y][x][2]);     // real (rounded) color
                
              for (var z = 0; z < 3; z++) {
                /*
                        X   5   3
                2   4   5   4   2
                    2   3   2
                      (1/32)
                */
                  var cc = tmpPArr[y][x][z],              // current color
                      rcz = rc[z];
                  var err = cc-rcz;              // error amount
                  tmpPArr[y][x][z] = rcz;                  // saving real color
                  if (x + 1 < canvas.width)   tmpPArr[y][x+1][z] += (err*5)>>5;  // if right neighbour exists
                  if (x + 2 < canvas.width)   tmpPArr[y][x+2][z] += (err*3)>>5;  // if right+1 neighbour exists
                  if (y + 1 == canvas.height) continue;   // if we are in the (pre)last line
                  if (x > 1)                  tmpPArr[y+1][x-2][z] += (err*2)>>5;  // bottom left-1 neighbour
                  if (x > 0)                  tmpPArr[y+1][x-1][z] += (err*4)>>5;  // bottom left neighbour
                                              tmpPArr[y+1][x][z] += (err*5)>>5;  // bottom neighbour
                  if (x + 1 < canvas.width)   tmpPArr[y+1][x+1][z] += (err*4)>>5;  // bottom right neighbour
                  if (x + 2 < canvas.width)   tmpPArr[y+1][x+2][z] += (err*2)>>5;  // bottom right+1 neighbour
                  if (y + 2 == canvas.height) continue;   // if we are in the last line
                  if (x > 0)                  tmpPArr[y+2][x-1][z] += (err*2)>>5;  // bottom+1 left neighbour
                                              tmpPArr[y+2][x][z] += (err*3)>>5;  // bottom+1 neighbour
                  if (x + 1 < canvas.width)   tmpPArr[y+2][x+1][z] += (err*2)>>5;  // bottom+1 right neighbour
              }
            }
          }
      }
      console.log("Dithering done. Writing back to canvas...");
      
      for (var y = 0; y < canvas.height; y++) {
          var newStr = tmpPArr[y];
            
          for (var x = 0; x < canvas.width; x++) {
              var imgData = image.getImageData(x, y, 1, 1);
              
              imgData.data[0]   = Math.floor(newStr[x][0]);
              imgData.data[1] = Math.floor(newStr[x][1]);
              imgData.data[2] = Math.floor(newStr[x][2]);
              
              image.putImageData(imgData,x,y);
          }
      }
      console.log("Converted. Starting draw sequence.");
      tmpPArr = [];
      return 1;
    }

    img.onload = function(){
      canvas.width = img.width;
      canvas.height = img.height;
      image = canvas.getContext('2d');
      image.drawImage(img, 0, 0, img.width, img.height);
      total = canvas.width * canvas.height;
      
      if (typeof debug != "undefined" && debug == 1) {
        document.body.appendChild(canvas);
        Object.assign(canvas.style, {
          transform: `translate(0px,0px)`,
          position: "absolute",
          top: 0,
          left: 0,
          width: undefined,
          pointerEvents: "none",
          zIndex: 5,
          opacity: 0.5,
        });
      }

      for(var _x = 0; _x < canvas.width; _x++) {
        for(var _y = 0; _y < canvas.height; _y++) {
          var pixel = image.getImageData(_x, _y, 1, 1).data;
          if (pixel[3] <= 127) counter[0]++;
        }
      }

      if (convert == 1) {
        setTimeout (function () {image_loaded_flag = doDeltaEConvertion()}, 1000);
      } else {
        image_loaded_flag = true;
      }
    };

    return {
      drawImage: drawImage,
      isReady: isReady
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
