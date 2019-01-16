// ????
var M_PI = 3.14159265358979323846;
var M_DEG_TO_RAD = M_PI / 180.0;
var CONSTANTS_RADIUS_OF_EARTH = 6371000;			/* meters (m)		*/
var DBL_EPSILON = Number.EPSILON;//2.2204460492503131e-016; 
var M_RAD_TO_DEG = (180.0 / M_PI);
var M_2PI = 6.28318530717958647692528676655900576;
var qgeocoordinate_EARTH_MEAN_RADIUS = 6371.0072;

// CoordTypeEnum
var CoordType = {};
CoordType.CoordTypeInterior = 0;
CoordType.CoordTypeInteriorHoverTrigger = 1;
CoordType.CoordTypeInteriorTerrainAdded = 2;
CoordType.CoordTypeSurveyEdge = 3
CoordType.CoordTypeTurnaround = 4

// EntryLocationType
var EntryLocation = new Object();
EntryLocation.type = {
    EntryLocationFirst: 0,
    EntryLocationTopLeft: 1,
    EntryLocationFirst: 1,
    EntryLocationTopRight: 2,
    EntryLocationBottomLeft: 3,
    EntryLocationBottomRight: 4,
    EntryLocationLast: 5,
    EntryLocationBottomRight: 5
};


class Options { // ?????
    constructor() {
        // Camera
        this.camera = new Object();
        this.camera.altitude = 50
        this.camera.triggerDist = 25
        this.camera.spacing = 25

        // Transects
        this.transects = new Object();
        this.transects.angle = 0
        this.transects.turnAroundDist = 10
        this.transects.hoverAndCapture = false
        this.transects.reflyAtNTDegOffset = false
        this.transects.imgInTurnAround = true
        this.transects.relativeAltitude = true

        // Terrain
        this.terrain = new Object();
        this.terrain.vehicleFllowTerrain = false
    }
}

// Some class
(function () {
    var _Point = function (lat, lng, alt) {
        this.lat = lat || 0.0;
        this.lng = lng || 0.0;
        this.alt = alt || 0.0;
    };

    // override operator ==
    _Point.prototype.equals = function (obj) {
        if (this.lng == obj.lng && this.lat == obj.lat && this.alt == obj.alt) { return true; }
        return false;
    }

    _Point.prototype.distanceTo = function (other) {
        // Haversine formula
        var dlat = qDegreesToRadians(other.lat - this.lat);
        var dlon = qDegreesToRadians(other.lng - this.lng);
        var haversine_dlat = Math.sin(dlat / 2.0);
        haversine_dlat *= haversine_dlat;
        var haversine_dlon = Math.sin(dlon / 2.0);
        haversine_dlon *= haversine_dlon;
        var y = haversine_dlat +
            Math.cos(qDegreesToRadians(this.lat)) *
            Math.cos(qDegreesToRadians(other.lat)) *
            haversine_dlon;
        var x = 2 * Math.asin(Math.sqrt(y));
        return x * qgeocoordinate_EARTH_MEAN_RADIUS * 1000;
    }

    _Point.prototype.azimuthTo = function (other) {
        var dlon = qDegreesToRadians(other.lng - this.lng);
        var lat1Rad = qDegreesToRadians(this.lat);
        var lat2Rad = qDegreesToRadians(other.lat);

        var y = Math.sin(dlon) * Math.cos(lat2Rad);
        var x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dlon);

        var azimuth = qRadiansToDegrees(Math.atan2(y, x)) + 360.0;
        var whole = parseInt(azimuth); //整数部分
        var fraction = azimuth - whole; //小数部分
        return (whole + 360) % 360 + fraction;
    }

    _Point.prototype.atDistanceAndAzimuth = function (distance, azimuth, distanceUp) {
        distanceUp = 0.0;

        var resultLon, resultLat;
        var latRad = qDegreesToRadians(this.lat);
        var lonRad = qDegreesToRadians(this.lng);
        var cosLatRad = Math.cos(latRad);
        var sinLatRad = Math.sin(latRad);

        var azimuthRad = qDegreesToRadians(azimuth);

        var ratio = (distance / (qgeocoordinate_EARTH_MEAN_RADIUS * 1000.0));
        var cosRatio = Math.cos(ratio);
        var sinRatio = Math.sin(ratio);

        var resultLatRad = Math.asin(sinLatRad * cosRatio +
            cosLatRad * sinRatio * Math.cos(azimuthRad));
        var resultLonRad = lonRad + Math.atan2(Math.sin(azimuthRad) * sinRatio * cosLatRad,
            cosRatio - sinLatRad * Math.sin(resultLatRad));

        resultLat = qRadiansToDegrees(resultLatRad);
        resultLon = qRadiansToDegrees(resultLonRad);

        var resultAlt = this.alt + distanceUp;
        return new _Point(resultLat, wrapLong(resultLon), resultAlt);
    }

    _Point.prototype.lngLat2WebMercator = function () {
        var dst = new _Point(0, 0, 0);
        var earthRad = 6378137.0;
        dst.lng = this.lng * Math.PI / 180 * earthRad;
        var a = this.lat * Math.PI / 180;
        dst.lat = earthRad / 2 * Math.log((1.0 + Math.sin(a)) / (1.0 - Math.sin(a)));
        return dst;
    }

    _Point.prototype.webMercator2LngLat = function () {
        var dst = new _Point(0, 0, 0);
        dst.lng = this.lng / 20037508.34 * 180;
        dst.lat = this.lat / 20037508.34 * 180;
        dst.lat = 180 / Math.PI * (2 * Math.atan(Math.exp(dst.lat * Math.PI / 180)) - Math.PI / 2);
        return dst; //[114.32894001591471, 30.58574800385281]
    }

    _Point.prototype.convertNedToGeo = function (origin) {
        var x_rad = this.lng / CONSTANTS_RADIUS_OF_EARTH;
        var y_rad = this.lat / CONSTANTS_RADIUS_OF_EARTH;
        var c = Math.sqrt(x_rad * x_rad + y_rad * y_rad);
        var sin_c = Math.sin(c);
        var cos_c = Math.cos(c);

        var ref_lon_rad = origin.lng * M_DEG_TO_RAD; //longitude ??
        var ref_lat_rad = origin.lat * M_DEG_TO_RAD; //latitude  ??

        var ref_sin_lat = Math.sin(ref_lat_rad);
        var ref_cos_lat = Math.cos(ref_lat_rad);

        var lat_rad;
        var lon_rad;

        if (Math.abs(c) > DBL_EPSILON) {
            lat_rad = Math.asin(cos_c * ref_sin_lat + (x_rad * sin_c * ref_cos_lat) / c);
            lon_rad = (ref_lon_rad + Math.atan2(y_rad * sin_c, c * ref_cos_lat * cos_c - x_rad * ref_sin_lat * sin_c));

        } else {
            lat_rad = ref_lat_rad;
            lon_rad = ref_lon_rad;
        }
        return new _Point(lon_rad * M_RAD_TO_DEG, lat_rad * M_RAD_TO_DEG, -this.alt + origin.alt);
    }

    _Point.prototype.convertGeoToNed = function (origin) {
        if (this.lat == origin.lat && this.lng == origin.lng) {
            // Short circuit to prevent NaNs in calculation
            return new _Point(0, 0, 0);
        }
        var lat_rad = this.lat * M_DEG_TO_RAD;  //latitude??*M_DEG_TO_RAD
        var lon_rad = this.lng * M_DEG_TO_RAD; //longitude??*M_DEG_TO_RAD

        var ref_lon_rad = origin.lng * M_DEG_TO_RAD;//longitude??*M_DEG_TO_RAD
        var ref_lat_rad = origin.lat * M_DEG_TO_RAD;//latitude??*M_DEG_TO_RAD

        var sin_lat = Math.sin(lat_rad);
        var cos_lat = Math.cos(lat_rad);
        var cos_d_lon = Math.cos(lon_rad - ref_lon_rad);

        var ref_sin_lat = Math.sin(ref_lat_rad);
        var ref_cos_lat = Math.cos(ref_lat_rad);

        var c = Math.acos(ref_sin_lat * sin_lat + ref_cos_lat * cos_lat * cos_d_lon);
        var k = (Math.abs(c) < DBL_EPSILON) ? 1.0 : (c / Math.sin(c));

        var lat = k * (ref_cos_lat * sin_lat - ref_sin_lat * cos_lat * cos_d_lon) * CONSTANTS_RADIUS_OF_EARTH;
        var lng = k * cos_lat * Math.sin(lon_rad - ref_lon_rad) * CONSTANTS_RADIUS_OF_EARTH;
        var z = -(this.alt - origin.alt);

        return new _Point(lng, lat, z);
    }

    window._Point = _Point;
})();

/* class _Polyline {
    constructor() {
        this.points = new Array(_Point);
        this.points.shift();
    }
} */

/* class _Line {
    constructor() {
        this.p1 = new _Point(0, 0, 0);
        this.p2 = new _Point(0, 0, 0);
        this.length = 0;
        this.angle = 0;
    }
} */

(function () {
    var _Polyline = function () {
        this.points = new Array(_Point);
        this.points.shift();
    }
    _Polyline.prototype.nedPolyline = function () {
        var nedPolyline = new Array(_Point);
        nedPolyline.shift();

        if (this.points.length > 0) {
            var tangentOrigin = this.points[0];
            for (var i = 0; i < this.points.length; i++) {
                var geoToNedResult;
                var vertex = this.points[i];
                if (i == 0) {
                    geoToNedResult = new _Point(0, 0, 0);
                } else {
                    geoToNedResult = vertex.convertGeoToNed(tangentOrigin);
                }
                nedPolyline.push(geoToNedResult);
            }
        }
        return nedPolyline;
    }

    window._Polyline = _Polyline;
})();

(function () {
    var _Line = function (pt1, pt2) {
        this.p1 = pt1 || new _Point(0, 0, 0);
        this.p2 = pt2 || new _Point(0, 0, 0);
        this.length = 0;
        this.angle = 0;
    }

    // override operator ==
    _Line.prototype.equals = function (obj) {
        if (this.p1.equals(obj.p1) && this.p2.equals(obj.p2) && this.length == obj.length && this.angle == obj.angle) { return true; }
        return false;
    }


    _Line.prototype.unitVector = function () {
        var x = this.p2.lng - this.p1.lng;
        var y = this.p2.lat - this.p1.lat;

        var len = Math.sqrt(x * x + y * y);
        var f = new _Line(this.p1, new _Point(this.p1.lng + x / len, this.p1.lat + y / len, 0));
        return f;
    }

    _Line.prototype.setLength = function (distance) {
        /* if (isNull())
        return; */
        var v = this.unitVector();
        p2 = new _Point(this.p1.lng + (v.p2.lng - v.p1.lng) * distance, this.p1.lat + (v.p2.lat - v.p1.lat) * distance, 0);
    }

    _Line.prototype.getLength = function () {

        var dx = this.p1.lng - this.p2.lng;
        var dy = this.p1.lat - this.p2.lat;
        return Math.sqrt(dx * dx, dy * dy);
    }

    _Line.prototype.setAngle = function (angle) {
        var angleR = angle * M_2PI / 360.0;
        var l = this.getLength();

        var dx = Math.cos(angleR) * l;
        var dy = -Math.sin(angleR) * l;

        this.p2.lng = this.p1.lng + dx;
        this.p2.lat = this.p1.lat + dy;
    }

    _Line.prototype.getAngle = function () {
        var dx = this.p2.lat - this.p1.lat;
        var dy = this.p2.lng - this.p1.lng;

        var theta = Math.atan2(-dy, dx) * 360.0 / M_2PI;

        var theta_normalized = theta < 0 ? theta + 360 : theta;

        if (theta_normalized = 360.0)
            return 0.0;
        else
            return theta_normalized;
    }

    _Line.prototype.setP1 = function (point) {
        this.p1 = point;
    }

    _Line.prototype.setP2 = function (point) {
        this.p2 = point;
    }

    _Line.prototype.lineIntersect = function (cmpline, intersectPt) {
        var a = new _Point((this.p2.lng - this.p1.lng), (this.p2.lat - this.p1.lat), 0);
        var b = new _Point((cmpline.p1.lng - cmpline.p2.lng), (cmpline.p1.lat - cmpline.p2.lat), 0);
        var c = new _Point((this.p1.lng - cmpline.p1.lng), (this.p1.lat - cmpline.p1.lat), 0);

        var denominator = a.lat * b.lng - a.lng * b.lat;
        if (denominator == 0 || !isFinite(denominator))
            return 0;

        var reciprocal = 1 / denominator;
        var na = (b.lat * c.lng - b.lng * c.lat) * reciprocal;
        if (intersectPt != null) {
            var nlng = this.p1.lng + a.lng * na;
            var nlat = this.p1.lat + a.lat * na;
            parseFloat

            intersectionPoint = new _Point(parseFloat(nlng.toFixed(9)), parseFloat(nlat.toFixed(9)), 0);// = pt1 + a * na;
            return intersectionPoint;
        }

        if (na < 0 || na > 1)
            return 2;

        var nb = (a.lng * c.lat - a.lat * c.lng) * reciprocal;
        if (nb < 0 || nb > 1)
            return 2;

        return 1;
    }

    window._Line = _Line;
}
)();

(function () {
    // FIXIT: repalce points with polygon path.
    var _Polygon = function () {
        this.points = new Array(_Point);
        this.points.shift();
    }

    _Polygon.prototype.calcArea = function () {
        var area = 0.0;
        if (this.points.length < 3) return area;

        for (var i = 0; i < this.points.length; ++i) {
            if (i != 0) {
                area += this.points[i - 1].lng * this.points[i].lat - this.points[i].lng * this.points[i - 1].lat;
            }
            else {
                area += this.points[this.points.length - 1].lng * this.points[i].lat - this.points[i].lng * this.points[this.points.length - 1].lat;
            }
        }
        return 0.5 * Math.abs(area);
    }

    _Polygon.prototype.vertexCoordinate = function (vertex) {
        if (vertex >= 0 && vertex < this.points.length) {
            return this.points[vertex];
        } else {
            return new _Point(0, 0, 0);
        }
    }

    _Polygon.prototype.nedPolygon = function () {
        //QList<QPointF>  nedPolygon;
        var nedPolygon = new Array(_Point)
        nedPolygon.shift();

        if (this.points.length > 0) {
            var tangentOrigin = this.vertexCoordinate(0);

            for (var i = 0; i < this.points.length; i++) {
                var tmpNedPoint;
                var vertex = this.vertexCoordinate(i);
                if (i == 0) {
                    tmpNedPoint = new _Point(0, 0, 0);
                } else {
                    tmpNedPoint = vertex.convertGeoToNed(tangentOrigin);
                }
                nedPolygon.push(tmpNedPoint);
            }
        }

        return nedPolygon;
    }

    _Polygon.prototype.offset = function () {
         var rgNewPolygon = new Array(_Point);//QList < QGeoCoordinate >
         rgNewPolygon.shift();

        // I'm sure there is some beautiful famous algorithm to do this, but here is a brute force method
        if (this.points.length > 2) {
            // Convert the polygon to NED
            //QList<QPointF> rgNedVertices = nedPolygon();
            var rgNedVertices = nedPolygon();

            // Walk the edges, offsetting by the specified distance
            var rgOffsetEdges = new Array(_Line);//QList < QLineF >
            rgOffsetEdges.shift();
            for (var i = 0; i < rgNedVertices.length; i++) {
                var lastIndex = (i == rgNedVertices.length - 1 ? 0 : i + 1);
                var offsetEdge;//QLineF  
                var originalEdge = new _Line(rgNedVertices[i], rgNedVertices[lastIndex]);

                var workerLine1 = originalEdge; // QLinef
                workerLine1.setLength(distance);
                workerLine1.setAngle(workerLine1.getAngle() - 90.0);
                offsetEdge.setP1(workerLine1.p2);

                var workerLine2 = new _Line(originalEdge.p2, originalEdge.p1);
                workerLine2.setLength(distance);
                workerLine2.setAngle(workerLine2.getAngle() + 90.0);
                workerLine2.setP2(workerLine2.p2);

                rgOffsetEdges.append(offsetEdge);
            }

            // Intersect the offset edges to generate new vertices
            var newVertex = new _Point;//QPointF
            var tangentOrigin = this.vertexCoordinate(0);// QGeoCoordinate
            for (var i = 0; i < rgOffsetEdges.count(); i++) {
                var prevIndex = (i == 0 ? rgOffsetEdges.length - 1 : i - 1);
                if (rgOffsetEdges[prevIndex].lineIntersect(rgOffsetEdges[i], newVertex) == 0) {
                    // FIXME: Better error handling?
                    return;
                }
                rgNewPolygon.push(newVertex.convertNedToGeo(tangentOrigin));
            }
        }

        // Update internals
        this.points = [];
        this.appendVertices(rgNewPolygon);
    }

    _Polygon.prototype.appendVertices = function(coordinates)
    {
       for (var i = 0; i < coordinates.length; ++i)
       {
           this.points.push(coordinates[i]);
       }
    }
    window._Polygon = _Polygon;
})();

(function () {
    var _CoordInfo = function () {
        this.type = CoordType.CoordTypeInterior;
        this.coord = new _Point(0, 0, 0);
    }

    window._CoordInfo = _CoordInfo;
})();

(function () {
    var _PathHeightInfo = function () {
        this.latStep = 0.0;    ///< Amount of latitudinal distance between each returned height
        this.lonStep = 0.0;    ///< Amount of longitudinal distance between each returned height
        this.heights = new Array();    /// double< Terrain heights along path 
    }

    window._PathHeightInfo = _PathHeightInfo;
})();

(function () {
    var _ItemCase = function () {
        this.doJumpId = -1;
        this.command = -1;
        this.frame = -1;
        this.params = [];
        this.autoContinue = false;
        this.isCurrentItem = false;
        this.type = "";
    }
    window._ItemCase = _ItemCase;
})();

(function () {
    var _CameraCalc = function (jsonobj) {
        this.Vehicle = jsonobj.Vehicle;
        this.IsManual = false;
        this.Dirty = false;
        this.DisableRecalc = false;
        this.DistanceToSurfaceRelative = true;
        this.SideOverlap = 70;
        this.FrontalOverlap = 70;
        this.LandScape = false;
        //this._metaDataMap                  =FactMetaData::createMapFromJsonFile=QStringLiteral=":/json/CameraCalc.FactMetaData.json";this.this;;
        this.CameraName = jsonobj.CameraName;
        this.ValueSetIsDistance = jsonobj.ValueSetIsDistance;
        this.DistanceToSurface = jsonobj.DistanceToSurface;
        this.ImageDensity = jsonobj.ImageDensity;
        this.FrontalOverlap = jsonobj.FrontalOverlap;
        this.SideOverlap = jsonobj.SideOverlap;
        this.AdjustedFootprintSide = jsonobj.AdjustedFootprintSide;
        this.AdjustedFootprintFrontal = jsonobj.AdjustedFootprintFrontal;
    }

    window._CameraCalc = _CameraCalc;
})();


// 由中点和屏幕宽高获得一个默认大小的矩形框.
function calcPolygonCornor(centerPoint, width, height, maxwidht, mecOrNot) {
    var poly = new _Polygon();
    var mecarr = centerPoint.lngLat2WebMercator();
    var isMec = mecOrNot;
    if (isMec) {
        width = Math.min(width, maxwidht);
        height = Math.min(height, maxwidht);
        width *= 0.75;
        height *= 0.75;
        var rectx = mecarr.lng - width / 2;
        var recty = mecarr.lat + height / 2;
        poly.points.push((new _Point(rectx, recty, 0)).webMercator2LngLat());
        poly.points.push((new _Point(rectx + width, recty, 0)).webMercator2LngLat());
        poly.points.push((new _Point(rectx + width, recty - height, 0)).webMercator2LngLat());
        poly.points.push((new _Point(rectx, recty - height, 0)).webMercator2LngLat());

    }
    else {
        var ltPoint = new _Point(0, 0, 0);
        var lbPoint = new _Point(0, 0, 0);
        var rtPoint = new _Point(0, 0, 0);
        ltPoint.lng = centerPoint.lng - width / 2;
        ltPoint.lat = centerPoint.lat + height / 2;
        lbPoint.lng = centerPoint.lng - width / 2;
        lbPoint.lat = centerPoint.lat - height / 2;
        rtPoint.lng = centerPoint.lng + width / 2;
        rtPoint.lat = centerPoint.lat + height / 2;

        var mwidht = ltPoint.distanceTo(rtPoint);
        var mheight = ltPoint.distanceTo(lbPoint);
        mwidht = Math.min(mwidht, maxwidht);
        mheight = Math.min(mheight, maxwidht)
        mwidht *= 0.75;
        mheight *= 0.75;
        var rectx = mecarr.lng - mwidht / 2;
        var recty = mecarr.lat + mheight / 2;
        poly.points.push((new _Point(rectx, recty, 0)).webMercator2LngLat());
        poly.points.push((new _Point(rectx + mwidht, recty, 0)).webMercator2LngLat());
        poly.points.push((new _Point(rectx + mwidht, recty - mheight, 0)).webMercator2LngLat());
        poly.points.push((new _Point(rectx, recty - mheight, 0)).webMercator2LngLat());
    }

    return poly;
}

function rotateEntryPoint(args) { //TODO:????
    return null;
}

function wrapLong(lng) {
    if (lng > 180.0)
        lng -= 360.0;
    else if (lng < -180.0)
        lng += 360.0;
    return lng;
}

function _rotatePoint(point, origin, angle) {
    var radians = (M_PI / 180.0) * -angle;

    var lng = ((point.lng - origin.lng) * Math.cos(radians)) - ((point.lat - origin.lat) * Math.sin(radians)) + origin.lng;
    var lat = ((point.lng - origin.lng) * Math.sin(radians)) + ((point.lat - origin.lat) * Math.cos(radians)) + origin.lat;

    return new _Point(lng, lat, 0);
}

function JSModf(val) { // rst[0] ???? rst[1] ????
    var rst = [];
    rst.push(val / 1.0);
    rst.push(val % 1.0);
    return rst;
}

function qRadiansToDegrees(d) {
    return d * 180.0 / M_PI;
}

function qDegreesToRadians(degrees) {
    return degrees * (M_PI / 180);
}

function _clampGridAngle90(gridAngle) {
    // Clamp grid angle to -90<->90. This prevents transects from being rotated to a reversed order.
    // ?????-90?90?????????????????????
    if (gridAngle > 90.0) {
        gridAngle -= 180.0;
    } else if (gridAngle < -90.0) {
        gridAngle += 180;
    }
    return gridAngle;
}

//TODO ????
function _intersectLinesWithPolygon(lineList, polygon) {
    var resultLines = new Array(_Line); //?????
    resultLines.shift();

    for (var i = 0; i < lineList.length; i++) {
        var line = lineList[i];
        var intersections = new Array(_Point);  // QList<QPointF>
        intersections.shift();
        // Intersect the line with all the polygon edges
        // ?????????
        for (var j = 0; j < polygon.points.length - 1; j++) {
            var intersectPoint = new _Point(0, 0, 0); //QPointF
            var tmpline = new _Line();
            tmpline.p1 = polygon.points[j];
            tmpline.p2 = polygon.points[j + 1]; //QLineF
            if (line.lineIntersect(tmpline, null) == 1) {
                intersectPoint = line.lineIntersect(tmpline, intersectPoint);
                if (!isInList(intersections, intersectPoint)) {
                    intersections.push(intersectPoint);
                }
            }

        }

        // We now have one or more intersection points all along the same line. Find the two
        // which are furthest away from each other to form the transect.
        // ???????????????????????????????????????????
        if (intersections.length > 1) {
            var firstPoint = new _Point(0, 0, 0); //QPointF
            var secondPoint = new _Point(0, 0, 0); //QPointF
            var currentMaxDistance = 0;//double

            for (var k = 0; k < intersections.length; k++) {
                for (var j = 0; j < intersections.length; j++) {
                    var newMaxDistance = intersections[k].distanceTo(intersections[j]); //?????????
                    if (newMaxDistance > currentMaxDistance) {
                        firstPoint = intersections[k];
                        secondPoint = intersections[j];
                        currentMaxDistance = newMaxDistance;
                    }
                }
            }
            var tmpLine = new _Line;
            tmpLine.p1 = firstPoint;
            tmpLine.p2 = secondPoint;
            resultLines.push(tmpLine);
        }
    }

    return resultLines;
}

// Adjust the line segments such that they are all going the same direction with respect to going from P1->P2
function _adjustLineDirection(lineList) {
    var resultLines = new Array(_Line);
    resultLines.shift();
    var firstAngle = 0;
    for (var i = 0; i < lineList.length; i++) {
        var line = lineList[i];
        var adjustedLine = new Array(_Line); //QLineF
        adjustedLine.shift();
        var tmpAngle = line.getAngle();
        if (i == 0) {
            firstAngle = tmpAngle;
        }

        if (Math.abs(tmpAngle - firstAngle) > 1.0) {
            adjustedLine.p1 = line.p2;
            adjustedLine.p2 = line.p1;
        } else {
            adjustedLine = line;
        }

        resultLines.push(adjustedLine);
    }
    return resultLines;
}

function _adjustTransectsToEntryPointLocation(transects) {
    // break point...
    if (transects.length == 0) {
        return;
    }

    var reversePoints = false;
    var reverseTransects = false;
    var _entyrLocation;

    if (_entyrLocation == EntryLocation.type.EntryLocationBottomLeft || _entyrLocation == EntryLocation.type.EntryLocationBottomRight) {
        reversePoints = true;
    }
    if (_entyrLocation == EntryLocation.type.EntryLocationTopRight || _entyrLocation == EntryLocation.type.EntryLocationBottomRight) {
        reverseTransects = true;
    }

    if (reversePoints) {
        _reverseInternalTransectPoints(transects);
    }
    if (reverseTransects) {
        console.log("_adjustTransectsToEntryPointLocation Reverse Transects");
        _reverseTransectOrder(transects);
    }

    console.log("_adjustTransectsToEntryPointLocation Modified entry point:entryLocation" + transects);
}

function addInitionalPolyline(centerPoint, width, height, isMec = false) {
    // ignore isMec for template
    var retline = new _Polyline();

    var x = centerPoint.lng + (width / 2);
    var yInset = height / 4;
    var topPointCoord = new _Point(x, centerPoint.lat + yInset);
    var bottomPointCoord = new _Point(x, centerPoint.lat + height - yInset);

    retline.points.push(topPointCoord);
    retline.points.push(bottomPointCoord);
    return retline;
}

// Reverse the order of all points withing each transect, First point becomes last and so forth.
// ??????????????????????????????
function _reverseInternalTransectPoints(transects) {
    for (var i = 0; i < transects.length; i++) {
        var rgReversedCoords = []; //QList<QGeoCoordinate>
        var rgOriginalCoords = transects[i];//QList<QGeoCoordinate>&
        for (var j = rgOriginalCoords.length - 1; j >= 0; j--) {
            rgReversedCoords.push(rgOriginalCoords[j]);
        }
        transects[i] = rgReversedCoords;
    }
}

// Reverse the order of the transects. First transect becomes last and so forth.
function _reverseTransectOrder(transects) {
    var rgReversedTransects = new Array()
    for (var i = transects.length - 1; i >= 0; i--) {
        rgReversedTransects.push(transects[i]);
    }
    transects = rgReversedTransects;
}


// Reorders the transects such that the first transect is the shortest distance to the specified coordinate
// and the first point within that transect is the shortest distance to the specified coordinate.
//  @param distanceCoord Coordinate to measure distance against
//  @param transects Transects to test and reorder

function _optimizeTransectsForShortestDistance(distanceCoord, transects) {
    var rgTransectDistance = new Array();
    rgTransectDistance[0] = transects[0][0].distanceTo(distanceCoord); // transects.first().first().distanceTo(distanceCoord);
    rgTransectDistance[1] = transects[0][transects[0].length - 1].distanceTo(distanceCoord);//transects.first().last().distanceTo(distanceCoord);
    rgTransectDistance[2] = transects[transects.length - 1][0].distanceTo(distanceCoord);//transects.last().first().distanceTo(distanceCoord);
    rgTransectDistance[3] = transects[transects.length - 1][transects[transects[transects.length - 1].length - 1].length - 1].distanceTo(distanceCoord);//transects.last().last().distanceTo(distanceCoord)

    var shortestIndex = 0;
    var shortestDistance = rgTransectDistance[0];
    for (var i = 1; i < 3; i++) {
        if (rgTransectDistance[i] < shortestDistance) {
            shortestIndex = i;
            shortestDistance = rgTransectDistance[i];
        }
    }

    if (shortestIndex > 1) {
        // We need to reverse the order of segments
        // ??????????
        _reverseTransectOrder(transects);
    }
    if (shortestIndex & 1) {
        // We need to reverse the points within each segment
        // ?????????????
        _reverseInternalTransectPoints(transects);
    }
}

// Any where invoke this function, obj will override operator == like _Point.
function isInList(list, obj) {
    for (var i = 0; i < list.length; ++i) {
        if (obj.equals(list[i])) {
            return true;
        }
    }
    return false;
}

function offsetPolyline(line, distance) {
    //QList<QGeoCoordinate> rgNewPolyline;
    var rgNewPolyline = new _Polyline;

    // I'm sure there is some beautiful famous algorithm to do this, but here is a brute force method

    if (line.points.length > 1) {
        // Convert the polygon to NED
        //QList<QPointF> rgNedVertices = nedPolyline();
        var rgNedVertices = line.nedPolyline();


        // Walk the edges, offsetting by the specified distance
        var rgOffsetEdges = new Array(_Line);
        rgOffsetEdges.shift();
        for (var i = 0; i < rgNedVertices.length - 1; i++) {
            //QLineF  offsetEdge;
            var offsetEdge = new _Line();
            //QLineF  originalEdge(rgNedVertices[i], rgNedVertices[i + 1]);
            var originalEdge = new _Line();
            originalEdge.p1 = rgNedVertices[i];
            originalEdge.p2 = rgNedVertices[i + 1]


            var workerLine1 = originalEdge;
            workerLine1.length = workerLine1.p1.distanceTo(workerLine1.p2);
            //workerLine1.angle =  workerLine1.angle - 90.0;
            workerLine1.setLength(distance);
            workerLine1.setAngle(workerLine1.angle - 90.0);
            offsetEdge.p1 = workerLine1.p2;

            var workerLine2 = originalEdge;
            workerLine2.setLength();//= workerLine2.p1.distanceTo(workerLine2.p2);
            workerLine2.setAngle(workerLine2.angle + 90.0);
            offsetEdge.p2 = workerLine2.p2;

            rgOffsetEdges.push(offsetEdge);
        }

        //QGeoCoordinate  tangentOrigin = vertexCoordinate(0);
        var tangentOrigin = line.points[0];

        // Add first vertex
        //QGeoCoordinate coord;
        var coord1 = rgOffsetEdges[0].p1.convertNedToGeo(tangentOrigin);
        rgNewPolyline.points.push(coord1);

        // Intersect the offset edges to generate new central vertices
        var newVertex = new _Point(0, 0, 0);
        for (var i = 1; i < rgOffsetEdges.length; i++) {
            if (rgOffsetEdges[i - 1].lineIntersect(rgOffsetEdges[i], newVertex) == 0) {
                // Two lines are colinear
                newVertex = rgOffsetEdges[i].p2;
            }
            rgNewPolyline.points.push(newVertex.convertNedToGeo(tangentOrigin));
        }

        // Add last vertex
        var lastIndex = rgOffsetEdges.length - 1;
        var coord2 = rgOffsetEdges[lastIndex].p2.convertNedToGeo(tangentOrigin);
        rgNewPolyline.points.push(coord2);
    }

    return rgNewPolyline;
}

