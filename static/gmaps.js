
/*
Goals:
--buttons! options for:
    -animation speed
    -algorithm type
        -different options for different algos
*/

var CENTER = [37.783876,-122.414524];          // map center
var DEFAULT_DEST = [37.788047,-122.425339];      // default routing end
var DEFAULT_SOURCE = [37.785775,-122.40602];   // default routing start
var eMarker;           // the marker indicating where routing will start
var sMarker;           // the marker indicating where routing will end
var bestPath;          // a polyline indicating the shortest path found
var predList = {};     // 
var polylines = [];    // a list of all polylines created; used for clearing map
var map;               // google maps API map
var drawSpeeds = {     // duration between rendering each segment in the graph search
    "fast": 5,
    "slow": 15,
    "instant": 0
}

function initialize() {
    initButtons();
}

function initButtons() {
    // radio button group controlling algorithm selection
    initAlgoButtons();

    // bidirectional toggle button
    $(".bidirection .btn").click(function () {
        toggleBidirectional($(this));
        setTimeout(function ()  {
            // brief delay, otherwise it'll start before buttons have changed
            startAnimation();
        }, 1);
    });

    // radio buttons controlling draw speed
    $(".speed .btn").click(function () {
        $(".speed .btn").popover("hide");
        $(".speed .btn").removeClass("active");
        $(this).addClass("active");
        $(this).popover("show");
    });
}

function initAlgoButtons() {
    $(".algo .btn").click(function () {
        $(".algo .btn").removeClass("active");
        $(this).addClass("active");
        startAnimation();
    });

    $(".algo .astar").tooltip({
        placement: "top",
        title: "A* search algorithm"
    });

    $(".algo .dij").tooltip({
        placement: "top",
        title: "Dijkstra's search algorithm"
    });

    $(".algo .alt").tooltip({
        placement: "top",
        title: "A* Landmark Triangle Inequality"
    });
}

function initializeMap() {
    // enable bootstrap buttons
    var mapOptions = {
        center: createGLL(CENTER),
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true
    };
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    setMarkers(DEFAULT_SOURCE, DEFAULT_DEST);
    setMarkerEvents();
}

function createGLL(p) {
    return new google.maps.LatLng(p[0], p[1]);
}

function encodeQueryData(data) {
     var ret = [];
     for (var d in data)
            ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
     return ret.join("&");
}

function startAnimation() {
    // load the sequence
    var url = "http://localhost:5000/animation";
    //var url = "http://ryanpon.com/animation";
    var source = sMarker.getPosition();
    var dest = eMarker.getPosition();
    var bidirectional = $(".bidirection .btn").hasClass("active");
    var data = {
        "type": $(".algo .active").data("value"),
        "source": source.lat() + ',' + source.lng(),
        "dest": dest.lat() + ',' + dest.lng(),
        "bidirectional": bidirectional
    };
    data = encodeQueryData(data);
    var drawSpeed = getDrawSpeed();
    $.getJSON(url, data, function (d) { drawAnimation(d, drawSpeed) } );
}

function getDrawSpeed() {
    var speedText = $(".speed .active").data("value");
    return drawSpeeds[speedText];
}

function drawAnimation(data, drawSpeed) {
    resetMapLines();
    var sequence = data["sequence"];
    var nodeCoords = data["coords"];
    var path = data["path"];
    var wait = 0;
    for (var i = 0; i < sequence.length; ++i) {
        var node = sequence[i][0], actions = sequence[i][1];
        for (var k = 0; k < actions.length; ++k) {
            var edge = actions[k];
            drawSegment(node, edge, nodeCoords, wait);
            wait += drawSpeed;
        }
    }
    drawBestPath(path, wait);
}

function drawSegment(node, edge, nodeCoords, wait) {
    var path = [createGLL(nodeCoords[node]), createGLL(nodeCoords[edge])];
    var pLine = createPolyline(path, "#FF0000", 1, false);
    pLine.setMap(map);
    polylines.push(pLine);
    setTimeout(function ()  {
        if (pLine.getMap() != null) {
            if (edge in predList) {
                predList[edge].setMap(null);
                predList[edge] = null;
            }
                predList[edge] = pLine;
                pLine.setVisible(true);
        } 
    }, wait);
}

function drawBestPath(path, wait) {
    var googleLLPath = [];
    for (var i = 0; i < path.length; ++i) {
        googleLLPath.push(createGLL(path[i]));
    }
    bestPath = createPolyline(googleLLPath, "#000000", 2, false);
    bestPath.setMap(map);
    polylines.push(bestPath);
    setTimeout(function ()  {
        bestPath.setVisible(true);
    }, wait);
}

function setMarkers(source, dest) {
    sMarker = new google.maps.Marker({
        position: createGLL(source),
        map: map,
        title:"Start",
        draggable: true
    });
    eMarker = new google.maps.Marker({
        position: createGLL(dest),
        map: map,
        title:"End",
        draggable: true
    });
}

function setMarkerEvents() {
    google.maps.event.addListener(sMarker, 'dragend', function ()  {
        startAnimation();
    });
    google.maps.event.addListener(eMarker, 'dragend', function ()  {
        startAnimation();
    });
}

function resetMapLines() {
    for (var i = 0; i < polylines.length; ++i) {
        polylines[i].setMap(null);
    }
    polylines = [];
    predList = {};
}

function createPolyline(path, color, size, visible) {
    pLine = new google.maps.Polyline({
        path: path,
        strokeColor: color,
        strokeOpacity: .7,
        strokeWeight: size, 
        visible: visible
    });
    return pLine
}

function toggleBidirectional(elem) {
    if ($(elem).hasClass("active")) {
        $(elem).removeClass("btn-success");
        $(elem).addClass("btn-danger");
        $(elem).text("Bidirectional OFF");
        startAnimation();
    } else {
        $(elem).removeClass("btn-danger");
        $(elem).addClass("btn-success");
        $(elem).text("Bidirectional ON");
    }
}

/*function testMarkers() {
    var markers = [];
    for (var i = 0; i < POINTS.length; ++i) {
        var m = new google.maps.Marker({
            position: createGLL(POINTS[i]),
            map: map,
            draggable: true
        });
        markers.push(m);
    };
    return markers;
}*/

google.maps.event.addDomListener(window, 'load', initializeMap);

$(document).ready(function () {
    initialize();
});