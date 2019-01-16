/**
 * 
 */

(function() {
	const qgeocoordinate_EARTH_MEAN_RADIUS = 6371.0072;
	const M_PI = 3.14159265358979323846;

	function qRadiansToDegrees(d) {
		return d * 180.0 / M_PI;
	}

	function qDegreesToRadians(degrees) {
		return degrees * (M_PI / 180);
	}

	function wrapLong(lng) {
		if (lng > 180.0)
			lng -= 360.0;
		else if (lng < -180.0)
			lng += 360.0;
		return lng;
	}

	var QGeoCoordinate = function(lat, lng, alt) {
		this.lat = lat || 0.0;
		this.lng = lng || 0.0;
		this.alt = alt || 0.0;
	};

	QGeoCoordinate.prototype.distanceTo = function(other) {
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

	QGeoCoordinate.prototype.azimuthTo = function(other) {
		var dlon = Math.qDegreesToRadians(other.lng - this.lng);
		var lat1Rad = Math.qDegreesToRadians(this.lat);
		var lat2Rad = Math.qDegreesToRadians(other.lat);

		var y = Math.sin(dlon) * Math.cos(lat2Rad);
		var x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dlon);

		var azimuth = Math.qRadiansToDegrees(Math.atan2(y, x)) + 360.0;
		var whole = parseInt(azimuth); //整数部分
		var fraction = azimuth - whole; //小数部分
		return (whole + 360) % 360 + fraction;
	}

	QGeoCoordinate.prototype.atDistanceAndAzimuth = function(distance, azimuth, distanceUp) {
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
		return new QGeoCoordinate(resultLat, wrapLong(resultLon), resultAlt);
	}

	window.QGeoCoordinate = QGeoCoordinate;
})();
