/**
Copyright (c) 2010 Dennis Hotson

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
 */
(function() {
  "use strict";

jQuery.fn.springy = function(params) {
  var stiffness = params.stiffness || function(){ return 400.0 };
  var repulsion = params.repulsion || function(){ return 400.0 };
  var damping = params.damping || 0.5;
  var minEnergyThreshold = params.minEnergyThreshold || 0.00001;
  var nodeSelected = params.nodeSelected || null;
  var maxTeamSize = params.maxTeamSize || 5;
  var activeMass = params.activeMass || 500;

  var canvas = this[0];
  var ctx = canvas.getContext("2d");

  var graph = this.graph = params.graph || new Springy.Graph();
  var layout = this.layout = new Springy.Layout.ForceDirected(graph, stiffness, repulsion, damping, minEnergyThreshold);

  //We can check to see if the font has been loaded before using.
  var nodeFont = new function(){
    this.font = "16px Hanzel, sans-serif";

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = this.font;

    this.isReady = function(){
      if(!this.loaded && context.measureText("wE arE reaDY.").width === 113.6875)
        this.loaded = true;
      return this.loaded;
    }
  };

	// calculate bounding box of graph layout.. with ease-in
	var currentBB = layout.getBoundingBox();

	// convert to/from screen coordinates
	var toScreen = function(point) {
		var size = currentBB.topright.clone().subtract(currentBB.bottomleft),
    delta = point.clone().subtract(currentBB.bottomleft);
    return new Springy.Vector(delta.x / size.x * canvas.width, delta.y / size.y * canvas.height);
  };

  var fromScreen = function(point) {
    var size = currentBB.topright.clone().subtract(currentBB.bottomleft);
    return new Springy.Vector((point.x / canvas.width) * size.x + currentBB.bottomleft.x, (point.y / canvas.height) * size.y + currentBB.bottomleft.y);
  };

  function graphShake(){
    layout.eachNode(function(node, point){
      point.p = Springy.Vector.random();
    });
  }

  function findNodeAt(coord){
    var nearest = {};
    graph.nodes.forEach(function(node){
      var distance = node.distanceSquared(coord.x, coord.y);
      if(nearest.distance === undefined || distance < nearest.distance)
        if(node.containsPoint(coord))
          nearest = {
            node:node,
            distance:distance
          };
        });
    return nearest.node;
  }

	// half-assed drag and drop
	var selected = [];
  var edgeSelected = null;
  var dragged = null;
  var moved = 0;
  var selection = null;
  var clicks = 0;

  this.selectEdgeType=function(type){
    clearSelected();
    edgeSelected = type;
    if(dragged)
      dragged.point.active = false;
    dragged = null;
    renderer.start();
  };

  //Selection Modifications
  function addSelected(node){
    var array = selected.slice(), index = array.indexOf(node);
    if(index !== -1)
      array.splice(index, 1);
    array.push(node);
    updateSelected(array);
  }
  function toggleSelected(node){
    var array = selected.slice(), index = array.indexOf(node);
    if(index !== -1)
      array.splice(index, 1);
    else
      array.push(node);
    updateSelected(array);
  }
  function replaceSelected(node){
    var index = selected.indexOf(node);
    if(index === -1)
      updateSelected([ node ]);
  }
  function boxSelected(selectType){
    //select the first 5 closest to the start point and inside
    var x1 = Math.min(selection.start.x, selection.end.x) | 0,
    y1 = Math.min(selection.start.y, selection.end.y) | 0,
    x2 = x1 + Math.abs(selection.start.x - selection.end.x) | 0,
    y2 = y1 + Math.abs(selection.start.y - selection.end.y) | 0;

    var array = [];
    graph.nodes.forEach(function(node){
      if(!node.bb)
        return;
      if(array.indexOf(node) !== -1)
        return;
      if(node.bb.x > x1 && node.bb.x < x2 && node.bb.y > y1 && node.bb.y < y2){
        var dx = selection.start.x - node.bb.x, dy = selection.start.y - node.bb.y;
        array.push({ distanceSquared: dx*dx + dy*dy, node: node });
      }
    });
    array.sort(function(a, b){
      return b.distanceSquared - a.distanceSquared;
    });
    for(var i=0; i<array.length; i++)
      array[i] = array[i].node;

    if(selectType === "add"){
      for(var i=0; i<selection.before.length; i++){
        var index = array.indexOf(selection.before[i]);
        if(index !== -1)
          array.splice(index, 1);
        array.push(selection.before[i]);
      }
    }
    if(selectType === "toggle"){
      for(var i=0; i<selection.before.length; i++){
        var index = array.indexOf(selection.before[i]);
        if(index !== -1)
          array.splice(index, 1);
        else
          array.push(selection.before[i]);
      }
    }

    updateSelected(array);
  }
  function clearSelected(){
    updateSelected([]);
  }
  function updateSelected(array){
    if(array.length > maxTeamSize)
      array = array.slice(-maxTeamSize);

    for(var i=0; i<selected.length; i++)
      selected[i].selected = false;

    selected = array;
    for(var i=0; i<selected.length; i++){
      var point = layout.point(selected[i]);
      if(point)
        point.m = activeMass;
      selected[i].selected = true;
    }
  }
  function updateNodesSelected(){
    if (nodeSelected){
      var selectedEdges = [];
      for(var i=0,edge; i<graph.edges.length; i++){
        edge = graph.edges[i];
        if(selected.length > 1){

          for(var j=0; j<selected.length; j++)
            for(var k=0; k<selected.length; k++)
              if(selected[j] === edge.source && selected[k] === edge.target)
                selectedEdges.push(edge);
            }
            else
              for(var j=0; j<selected.length; j++)
                if(selected[j] === edge.source || selected[j] === edge.target || (selected[j].data.neighbors[ edge.source.id ] && selected[j].data.neighbors[ edge.target.id ]) )
                  selectedEdges.push(edge);
              }
              nodeSelected(selected, selectedEdges);
            }
          }

  //Pointer actions
  function pointerStart(coord, selectType){
    if(dragged)
      dragged.point.active = false;
    var node = findNodeAt(coord);
    if(!node){
      if(!selectType || selectType === "replace"){
        clearSelected();
        updateNodesSelected();
      }
      if(selectType)
        selection = { start: coord, before:selected, type:selectType };
      clicks = 0;
    }
    else{
      if(node.isSelected())
        clicks++;
      var point = fromScreen(coord);
      dragged = { node:node, point:layout.point(node) };
      dragged.offset = new Springy.Vector(dragged.point.p.x - point.x, dragged.point.p.y - point.y);
      dragged.coord = coord;
      dragged.point.active = true;
      dragged.point.m = activeMass;
    }
    moved = 0;
    renderer.start();
  }
  
  function pointerMove(coord, selectType){
    var point = fromScreen(coord);
    if (dragged !== null) {
      moved += coord.clone().subtract(dragged.coord).length();
      dragged.coord = coord;
      dragged.point.p = point.add(dragged.offset);
      dragged.point.m = activeMass;
      dragged.point.active = true;
    }
    else if(selection){
      selection.end = coord;
      selection.type = selectType;
      boxSelected(selectType);
      updateNodesSelected();
    }
    renderer.start();
  }
  
  function pointerEnd(clicked, selectType){
    selection = null;
    if(dragged != null){
      if(moved < 10){
        switch(selectType){
          case "add":
          addSelected( dragged.node );
          break;
          case "toggle":
          toggleSelected( dragged.node );
          break;
          case "replace":
          replaceSelected( dragged.node );
          break;
        }
        updateNodesSelected();
        edgeSelected = null;
      }
      dragged.point.active = false;
      dragged = null;
    }
    else if(clicked)
      edgeSelected = null;
  }

  function selectType(event){
    return (event.shiftKey)? "add": (event.ctrlKey)? "toggle": "replace";
  }

  function selectedOpen(node){
    if (node.data.onOpen) {
      node.data.onOpen();
    }
  }
  
  $(canvas).on('taphold', function(e) {
    e.preventDefault();
    if(clicks || e.shiftKey || e.ctrlKey)
      return;
    if(moved < 10 && dragged && dragged.node.isSelected()){
      selectedOpen(dragged.node);
      pointerEnd();
    }
  });
  $(canvas).on('dblclick', function(e) {
    e.preventDefault();
    if(clicks < 2 || e.shiftKey || e.ctrlKey)
      return;
    var pos = $(canvas).offset(),
    node = findNodeAt(new Springy.Vector(e.pageX - pos.left, e.pageY - pos.top));
    if(moved < 10 && node && node.isSelected())
      selectedOpen(node);
  });
  $('body').on('keyup', function(e){
    if(e.which === 27){ // escape
      e.preventDefault();
      clearSelected();
      if(nodeSelected){
        nodeSelected(selected);
      }
    }
    else if(e.which === 32){ // space bar
      e.preventDefault();
      graphShake();
    }
  });
  $(canvas).on('touchstart', function(e){
    e.preventDefault();
    var pos = $(canvas).offset(),
    event = window.event;
    pointerStart(new Springy.Vector(event.touches[0].pageX - pos.left, event.touches[0].pageY - pos.top));
  });
  $(canvas).on('touchmove', function(e) {
    e.preventDefault();
    var event = window.event,
    pos = $(canvas).offset();
    pointerMove(new Springy.Vector(event.touches[0].pageX - pos.left, event.touches[0].pageY - pos.top));
  });
  $(canvas).on('touchend',function(e) {
    e.preventDefault();
    pointerEnd(true, "toggle");
  });
  $(canvas).on('touchleave touchcancel',function(e) {
    e.preventDefault();
    pointerEnd(false, "toggle");
  });
  $(window).on('touchend',function(e) {
    pointerEnd(false, "toggle");
  });

  $(canvas).on('mousedown', function(e) {
    if(e.button === 2)
      return;
    e.preventDefault();
    var pos = $(canvas).offset();
    pointerStart(new Springy.Vector(e.pageX - pos.left, e.pageY - pos.top), selectType(e));
  });
  $(window).on('mousemove', function(e) {
    e.preventDefault();
    var pos = $(canvas).offset();
    pointerMove(new Springy.Vector(e.pageX - pos.left, e.pageY - pos.top), selectType(e));
  });
  $(window).on('mouseup',function(e) {
    e.preventDefault();
    if(e.target === canvas || dragged || selection)
      pointerEnd(true, selectType(e));
  });
  $(canvas).on('mousedown mousemove mouseenter mouseleave',function(e) {
    var state = '';
    if(selection)
      state = 'selecting'
    else if(dragged != null)
      state = 'dragging';
    else{
      var pos = $(canvas).offset();
      if(findNodeAt(new Springy.Vector(e.pageX - pos.left, e.pageY - pos.top)))
        state = 'hover';
    }
    switch(state){
      case 'selecting':
      $(canvas)[0].className="selecting";
      break;
      case 'dragging':
      $(canvas)[0].className="dragging";
      break;
      case 'hover':
      $(canvas)[0].className="hover";
      break;
      default:
      $(canvas)[0].className="";
    }
  });


  var nodeImages = {};
  var nodeImageContexts = {};
  var nodeImageContextQueue = {
    list:[],
    todo:{}
  };

  nodeImageContextQueue.push = function(id, callback){
    nodeImageContextQueue.insert(id, callback, 'push');
  }
  nodeImageContextQueue.unshift = function(id, callback){
    nodeImageContextQueue.insert(id, callback, 'unshift');
  }
  nodeImageContextQueue.insert = function(id, callback, method){
    nodeImageContextQueue.todo[id] = callback;
    nodeImageContextQueue.list[method].call(nodeImageContextQueue.list, id);
    if(!nodeImageContextQueue.timeout)
      nodeImageContextQueue.next();
  }
  nodeImageContextQueue.next = function(){
    if(nodeImageContextQueue.list.length === 0)
      return;
    var id = nodeImageContextQueue.list.shift();
    var todo = nodeImageContextQueue.todo[id];
    delete nodeImageContextQueue.todo[id];
    nodeImageContextQueue.timeout = setTimeout(function(){
      delete nodeImageContextQueue.timeout;
      todo.call(null);
      nodeImageContextQueue.next();
    }, 25);
  }

  function getHitbox(image){
    var size = image.width, 
    imageData = image.getContext('2d').getImageData(0, 0, size, size), 
    data = imageData.data, 
    x, 
    y,
    opaque = {};
    for(x=0; x<size; x++){
      opaque[x] = {};
      for(y=0; y<size; y++)
        if(data[(y*size*4) + x*4 + 3] > 127)
          opaque[x][y] = true;
      }
      return { size:size, opaque:opaque };
    }

    function addPortaitImages(src, image, color){
    //build the image 
    var canvas = document.createElement('canvas'),
    context = canvas.getContext('2d'),
    barHeight = Math.max(2, (image.width/10) | 0);
    canvas.width = canvas.height = image.width;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    context.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
    canvas.hitbox = getHitbox(canvas);

    if(nodeImages[src].portraits === undefined)
      nodeImages[src].portraits = [];
    nodeImages[src].portraits.push(canvas);

    var resize = image.width >> 1;
    if(resize >= 16){
      var resizeCanvas = document.createElement('canvas'),
      resizeContext = resizeCanvas.getContext('2d');
      resizeCanvas.width = resizeCanvas.height = resize;
      resizeContext.drawImage(image, 0, 0, resize, resize);
      nodeImageContextQueue.unshift(src, function(){
        addPortaitImages(src, resizeCanvas, color, resize);
      }, 'unshift');
    }
    else{
      nodeImages[src].loaded = true;
    }
  }

  var placeholders={};
  var placeholderCoords = [
    //Used the svg path from here and just filled the path with bezier curves.
    //The original size of the svg path was 220x220 so scale to new size.
    //https://upload.wikimedia.org/wikipedia/en/b/b9/No_free_portrait.svg
    3.5709275,215.81378,
    3.7352275,204.03019,3.8497975,199.05392,3.5005675,183.77748,
    11.214111,174.15409,38.3674,169.74066,45.785393,167.0981,
    55.358378,159.98075,66.203698,153.92378,75.552667,148.56151,
    80.7154,145.60034,80.782546,135.45005,80.404668,128.63362,
    78.689369,118.98009,77.782686,110.65561,70.86354,103.56735,
    70.47649,101.54341,69.346365,96.899211,65.948685,90.832271,
    63.662168,80.636072,54.650066,68.010083,56.914311,61.532735,
    62.944238,44.282973,57.676043,37.272904,61.378834,35.798494,
    69.823479,32.435953,72.10706,25.082426,79.841538,17.698566,
    102.43887,13.411138,98.965362,1.9932189,115.84961,4.1987589,
    136.77696,6.9324259,125.2515,10.014792,139.60507,17.279644,
    157.23926,26.204921,146.73196,27.108963,162.83032,50.739759,
    172.38972,64.771999,153.76819,65.728581,158.59298,78.146165,
    163.04993,89.617072,152.54354,91.572613,147.24294,104.12579,
    142.15767,116.16899,138.96668,119.70997,144.82195,135.58386,
    150.25927,150.32462,159.28667,143.58938,179.677,165.66778,
    184.85448,171.27389,203.45549,164.48784,216.26305,180.85898,
    216.25506,189.25148,216.44185,198.19473,216.49943,216.08121,
    159.09474,215.87646,3.5709275,215.81378,3.5709275,215.81378
    ];

    function getPlaceholder(size, color){
      var id = size + '_' + color;
      if(!placeholders[id]){
        var canvas, context;
        if(!placeholders[size]){
          var ratio = size / 220;
          canvas = document.createElement('canvas');
          context = canvas.getContext('2d');
          canvas.height = canvas.width = size;
          context.beginPath();
          context.moveTo(placeholderCoords[0] * ratio, placeholderCoords[1] * ratio);
          for(var i=2; i<placeholderCoords.length; i+=6)
            context.bezierCurveTo(
              placeholderCoords[i]*ratio, placeholderCoords[i+1]*ratio,
              placeholderCoords[i+2]*ratio, placeholderCoords[i+3]*ratio,
              placeholderCoords[i+4]*ratio, placeholderCoords[i+5]*ratio
              );
          context.closePath();
          context.lineWidth = 3;
          context.strokeStyle = "#868686";
          context.stroke();
          context.fillStyle = "#909090";
          context.fill();
          placeholders[size] = canvas;
        }
        var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        barHeight = Math.max(2, (size / 10) | 0);
        canvas.height = canvas.width = size;
        context.drawImage(placeholders[size], 0, 0, canvas.width, canvas.height);
        context.fillStyle = color || "#000";
        context.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
        canvas.hitbox = getHitbox(canvas);
        placeholders[id] = canvas;
      }
      return placeholders[id]
    }

    function getPortraitSizeTarget(number){
      var list = {};
      getPortraitSizeTarget = function(number){
        if(list[number] === undefined){
          var i = 1, last = 0;
          while(i != number && i + (i-last)>>1 < number){
            last = i;
            i = i << 1;
          }
          list[number] = i;
        }
        return list[number];
      }
      return getPortraitSizeTarget(number);
    }

  //we cache the best sized portrait with type bar
  Springy.Node.prototype.setPortraitImage = function(size){
    var portrait,
    img = this.data.image, 
    color = this.data.color || "#111111", 
    node = this;
    if(img){
      var src = img.src;
      if (src in nodeImages) {
        if (nodeImages[src].loaded) {
          //sample down for better antialiasing
          var portraits = nodeImages[src].portraits, 
          target = getPortraitSizeTarget(size);
          for(var i=0; i < portraits.length && portraits[i].width >= target; i++)
            portrait = portraits[i];
        }
      }
      else{
        nodeImages[src] = {  
          loaded: false,
          portraits:[]
        };
        var image = new Image();
        image.addEventListener("load", function (){
          nodeImageContextQueue.push(src, function(){
            addPortaitImages(src, image, color);
          });
        });
        image.src = src;
      }
    }
    if(!portrait)
      portrait = getPlaceholder(size, color);

    this.image = portrait;
    this.hitbox = portrait.hitbox;
  }

  Springy.Node.prototype.setPortraitText = function() {
    if(!this.text && nodeFont.isReady()){
      var canvas = document.createElement('canvas'),
      context = canvas.getContext('2d'),
      text = this.data.label.toUpperCase();

      context.font = nodeFont.font;
      var textWidth = context.measureText(text).width;
      var textHeight = 16;

      canvas.width = (textWidth + 6) | 0;
      canvas.height = (textHeight + 4) | 0;

      //draw the text background
      context.fillStyle = "rgba(0, 0, 0, 0.5)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      //draw the name
      context.font = nodeFont.font;
      context.fillStyle = "#ffffff";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.shadowColor = "#000";
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 1;
      context.fillText(text, 3, 0);

      this.text = canvas; 
    }
  }

  var renderer = this.renderer = new Springy.Renderer(layout,
    function clear() {
      currentBB = layout.getBoundingBox();
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(selection && selection.start && selection.end){
        boxSelected(selection.type);
        updateNodesSelected();
      }
      if(dragged){
        var point = fromScreen(dragged.coord);
        dragged.point.p = point.add(dragged.offset);
        dragged.point.m = activeMass;
      }
    },
    function processNode(node, point) {
      var s = toScreen(point), 
      x = (s.x | 0), 
      y = (s.y | 0), 
      fullSize = node.getSize() | 0, 
      halfSize = fullSize >> 1;
      //set images/bounds/hitboxes
      node.setPortraitText();
      node.setPortraitImage(fullSize);
      node.setBoundingBox(x - halfSize, y - halfSize, fullSize);
    },
    function drawEdge(edge, pointStart, pointEnd) {
      var p1 = toScreen(pointStart), p2 = toScreen(pointEnd);
      

      var isSelected = 0;
      if(edgeSelected){
        if(edge.data.effect === edgeSelected)
          isSelected = 1;
      }
      else if (selected.length === maxTeamSize){
        if(edge.source.isSelected() && edge.target.isSelected())
          isSelected = 1;
      }
      else if(selected.length > 1){
        var sourceSelected = edge.source.isSelected(), targetSelected = edge.target.isSelected();
        if(sourceSelected && targetSelected)
          isSelected = 1;
        else if(sourceSelected || targetSelected)
          isSelected = 0.5;
        else if(edge.target.isSelectedNeighbor() && edge.source.isSelectedNeighbor())
          isSelected = 0.5;
      }
      else if(selected.length){
        if(edge.source.isSelected() || edge.target.isSelected())
          isSelected = 1;
        if(edge.target.isSelectedNeighbor() && edge.source.isSelectedNeighbor())
          isSelected = 0.5;
      }
      else
        isSelected = 1;
      
      var normal = p2.clone().subtract(p1).normal().normalise();
      var from = graph.getEdges(edge.source, edge.target);
      var to = graph.getEdges(edge.target, edge.source);
      var total = from.length + to.length;

			// Figure out edge's position in relation to other edges between the same nodes
			var n = 0;
			for (var i=0; i<from.length; i++) {
				if (from[i].id === edge.id) {
					n = i;
				}
			}

			//change default to  10.0 to allow text fit between edges
			var spacing = Math.min(Math.max(4, Math.min(window.innerWidth, window.innerHeight)/50), 12);
      var padding = Math.max(1, spacing/3);

			// Figure out how far off center the line should be drawn
			var offset = normal.multiply(-((total - 1) * spacing)/2.0 + (n * spacing));
			var s1 = p1.clone().add(offset);
			var s2 = p2.clone().add(offset);
      var sdelta = s2.clone().subtract(s1).normalise();
      var weight = (selected.length > 1 && isSelected === 1)? 2: 1.0;
      var width = Math.max(weight *  1.5, 0.1);
      var arrowWidth = 1 + width;
      var arrowLength = Math.min(Math.max(4, Math.min(window.innerWidth, window.innerHeight)/50), 12);
      var overlapping = edge.target.overlapping(edge.source);
      var lineStart, lineEnd, lineDelta;
      var halfArrow = sdelta.clone().multiply( arrowLength * 0.75 );
      var sourceAbove = s1.y < s2.y;

      //get best line start/end
      if(overlapping){
        if(sourceAbove){
          lineStart = s1.clone();
          lineEnd = edge.target.intersectLine(s1, s2, padding + arrowLength * 0.75);
        }
        else{
          lineStart = edge.source.intersectLine(s2, s1);
          lineEnd = s2.clone().subtract(halfArrow);
        }
      }
      else{
        lineStart = edge.source.intersectLine(s2, s1);
        lineEnd = edge.target.intersectLine(s1, s2, padding + arrowLength * 0.75);

        //adjust if we have problems
        if(lineEnd.clone().subtract(lineStart).lengthSquared() < arrowLength*arrowLength || //line too short
          lineEnd.clone().subtract(lineStart).normalise().equals(sdelta.clone().multiply(-1))  || //line going in wrong direction
          (sourceAbove && edge.target.containsPoint(lineEnd)) || //source above and end point inside target
          (!sourceAbove && edge.source.containsPoint(lineStart)) //source below and end point inside source
          ){
          if(sourceAbove){
            lineStart = s1.clone();
            lineEnd = edge.target.intersectLine(s1, s2, padding + arrowLength * 0.75);
          }
          else{
            lineStart = edge.source.intersectLine(s2, s1);
            lineEnd = s2.clone().subtract(halfArrow);
          }
        }
      }
      var ldelta = lineEnd.clone().subtract(lineStart).normalise();

      var arrowStart = lineEnd.clone().add(halfArrow);
      var stroke = edge.data.color || '#000000';
      var alpha = (isSelected === 0)? 0.1: (isSelected === 0.5)? 0.5: 1.0;

      ctx.save();

      //settings
      ctx.lineWidth = width;
      ctx.lineCap = overlapping? "round": "butt";
      ctx.strokeStyle = stroke;
      ctx.fillStyle = stroke;
      ctx.globalAlpha = alpha;

      //line
      if(ldelta.equals(sdelta)){
       ctx.beginPath();
       ctx.moveTo(lineStart.x, lineStart.y);
       ctx.lineTo(lineEnd.x, lineEnd.y);
       ctx.closePath();
       ctx.stroke();
     }

			// arrow
			ctx.translate(arrowStart.x, arrowStart.y);
			ctx.rotate(Math.atan2(p2.y - p1.y, p2.x - p1.x));
			ctx.beginPath();
			ctx.moveTo(-arrowLength, arrowWidth);
			ctx.lineTo(0, 0);
			ctx.lineTo(-arrowLength, -arrowWidth);
			ctx.lineTo(-arrowLength * 0.8, -0);
			ctx.closePath();
			ctx.fill();

      ctx.restore();
    },
    function drawNode(node, point) {    
      var size = node.bb.size;

      if (node.isSelected())
        ctx.globalAlpha = 1.0;
      else if(edgeSelected)
        ctx.globalAlpha = (node.data.effects[edgeSelected])? 1.0: 0.25;
      else if(selected.length === maxTeamSize)
        ctx.globalAlpha = 0.25;
      else if(selected.length > 1)
        ctx.globalAlpha = (node.isSelectedNeighbor())? 0.75: 0.25;
      else if(selected.length)
        ctx.globalAlpha = (node.isSelectedNeighbor())? 1.0: 0.25;
      else
        ctx.globalAlpha = 1.0;

      //draw the portrait
      ctx.drawImage(node.image, node.bb.left, node.bb.top, size, size);
    },
    function drawNodeOverlay(node, point) {
      if (!node.isSelected() || !node.text)
        return;

      ctx.globalAlpha = 1.0;

      //draw the portrait text
      var width = node.text.width, height = node.text.height;
      ctx.drawImage(node.text, 
        Math.min(Math.max(0, node.bb.x - (width / 2) | 0), canvas.width - width), 
        Math.min(Math.max(0, node.bb.y - height - (node.bb.size / 2) | 0), canvas.height - height), 
        width, height);
    },
    function drawOverlay(){
      if(selection && selection.start && selection.end){
        var x = -0.5 + Math.min(selection.start.x, selection.end.x) | 0,
        y = -0.5 + Math.min(selection.start.y, selection.end.y) | 0,
        width = 0.5 + Math.abs(selection.start.x - selection.end.x) | 0,
        height = 0.5 + Math.abs(selection.start.y - selection.end.y) | 0;

        ctx.save();

        //translate the entire context by .5 to get 1px width lines
        ctx.translate(0.5, 0.5);

        //draw the dashed border
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#333";
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, width, height);

        //draw the overlay, but not over drawn content
        ctx.globalAlpha = 0.25;
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#000";
        ctx.fillRect(x, y, width, height);

        ctx.restore();
      }
    }
    );

Springy.Node.prototype.setBoundingBox = function(x, y, size) {
  this.bb = { 
    left:x, 
    top:y, 
    right:x+size, 
    bottom:y+size, 
    x:(x + size / 2)|0, 
    y:(y + size / 2)|0, 
    size:size 
  };
}

  // return true if inside BB and not over a 0 opacity pixel
  Springy.Node.prototype.containsPoint = function(point, y) {
    var x, px, py;
    if(y === undefined){
      y = point.y;
      x = point.x;
    }
    else
      x = point;

    if(this.bb && this.hitbox){
      px = (this.hitbox.size * (x - this.bb.left) / this.bb.size) | 0;
      py = (this.hitbox.size * (y - this.bb.top) / this.bb.size) | 0;
      if(this.hitbox.opaque[px])
        return this.hitbox.opaque[px][py] === true;
    }
    return false;
  }

  Springy.Node.prototype.overlappingBoundingBox = function(node) {
    return this.bb && node.bb &&
    this.bb.left <= node.bb.right && 
    this.bb.right >= node.bb.left &&
    this.bb.top <= node.bb.bottom && 
    this.bb.bottom >= node.bb.top;
  }

  Springy.Node.prototype.overlapping = function(node) {
    if(this.overlappingBoundingBox(node)){
      if(this.hitbox && node.hitbox){
        var tlx, tly, brx, bry;
        if(this.bb.bottom < node.bb.bottom){
          tly = node.bb.top | 0;
          bry = this.bb.bottom | 0;
        }
        else{
          tly = this.bb.top | 0;
          bry = node.bb.bottom | 0;
        }
        if(this.bb.left < node.bb.left){
          tlx = node.bb.left | 0;
          brx = this.bb.right | 0;
        }
        else{
          tlx = this.bb.left | 0;
          brx = node.bb.right | 0;
        }
        for(var x=tlx; x<brx; x++)
          for(var y=tly; y<bry; y++)
            if(this.containsPoint(x,y) && node.containsPoint(x,y))
              return true;
            return false;
          }
          return true;
        }
        return false;
      }

      Springy.Node.prototype.distanceSquared = function(x, y) {
        if(!this.bb)
          return null;
        var dx = this.bb.x - x, dy = this.bb.y - y;
        return dx*dx + dy*dy;
      }

      Springy.Node.prototype.isSelected = function() {
        return this.selected;
      }

      Springy.Node.prototype.isSelectedNeighbor = function() {
        for(var i=0; i<selected.length; i++)
          if(selected[i].data.neighbors[ this.id ])
            return true;
          return false;
        }

        Springy.Node.prototype.getSize = function() {
          var canvasSize = Math.min($(canvas).width(), $(canvas).height()),
          size = Math.min(Math.max(16, canvasSize >> 4), 128);
          if(this.isSelected())
            size *= 1.5;
          return size;
        }

        Springy.Node.prototype.intersectLine = function(start, end, padding){
          if(!this.bb)
            return end;

    // if we are inside the bbox but not over an opaque spot, we can start tracing from start
    var inBBox = this.bb.left <= start.x && this.bb.right >= start.x && this.bb.top <= start.y && this.bb.bottom >= start.y;
    if(inBBox && !this.containsPoint(start)){
      point = start.clone();
    }
    // find the bbox intersect
    else{
      var size = this.getSize(), 
      halfSize = (size >> 1) | 0,
      point = intersect_line_box(start, end, {x: this.bb.left, y: this.bb.top}, size, size);
      if(!point){
        return end;
      }
    }

    var delta = end.clone().subtract(point), length = delta.length();
    delta.divide(length);
    for(var i=0; i < length && !this.containsPoint(point); i++){
      point.x += delta.x;
      point.y += delta.y;
    }
    padding = Math.max(1, padding || 1);
    return point.subtract(delta.multiply(padding));
  }

  function intersect_line_box(start, end, topleft, size) {
    var tl = {x: topleft.x, y: topleft.y};
    var tr = {x: topleft.x + size, y: topleft.y};
    var bl = {x: topleft.x, y: topleft.y + size};
    var br = {x: topleft.x + size, y: topleft.y + size};
    var result;
    if (start.y < tr.y && (result = intersect_line_line(start, end, tl, tr))) // top
      return result;
    if (start.x > tr.x && (result = intersect_line_line(start, end, tr, br))) // right
      return result;
    if (start.y > bl.y && (result = intersect_line_line(start, end, br, bl))) // bottom
      return result;
    if (start.x < bl.x && (result = intersect_line_line(start, end, bl, tl))) // left
      return result;
    return false;
  }

  function intersect_line_line(p1, p2, p3, p4) {
    var denom = ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y));
    // lines are parallel
    if (denom === 0)
      return false;
    var ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
    var ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1)
      return false;
    return new Springy.Vector(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
  }

  renderer.start();
  return this;
}

})();
