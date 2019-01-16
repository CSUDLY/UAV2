/**
 * 
 */

(function () {

	var CorridorScanComplexItem = function (options) {
		this._transectsPathHeightInfo = new Array();
		this._corridorWidth = 0;
		this._corridorPolyline = new _Polyline;
		this._ignoreRecalc = false;
		this._entryPoint = 0;
	};

	CorridorScanComplexItem.prototype = new TransectStyleComplexItem();
	CorridorScanComplexItem.prototype.name = 'CorridorScanComplexItem';


	CorridorScanComplexItem.prototype.setCooridorWidth = function (w) {
		this._corridorWidth = w;
	}

	CorridorScanComplexItem.prototype._transectCount = function () {
		var transectSpacing = this.cameraCalc.AdjustedFootprintSide;
		var fullWidth = this._corridorWidth;
		return fullWidth > 0.0 ? Math.ceil(fullWidth / transectSpacing) : 1;
	}

	CorridorScanComplexItem.prototype._rebuildTransectsPhase1 = function (refly = false) {
		console.log("CorridorScanComplexItem _rebuildTransectsPhase1");
		if (this._ignoreRecalc) {
			return;
		}

		// If the transects are getting rebuilt then any previsouly loaded mission items are now invalid
		if (this._loadedMissionItemsParent) {
			this._loadedMissionItems = new Array();
			// FIXIT
			//_loadedMissionItemsParent->deleteLater();
			this._loadedMissionItemsParent = null;
		}

		this._transects = new Array;
		this._transectsPathHeightInfo = new Array(new Array(_PathHeightInfo));
		this._transectsPathHeightInfo.shift();

		var transectSpacing = this.cameraCalc.AdjustedFootprintSide;
		var fullWidth = this._corridorWidth;
		var halfWidth = fullWidth / 2.0;
		var transectCount = this._transectCount();
		var normalizedTransectPosition = transectSpacing / 2.0;

		if (this._corridorPolyline.points.length >= 2) {
			// First build up the transects all going the same direction
			//qDebug() << "_rebuildTransectsPhase1";
			for (var i = 0; i < transectCount; i++) {
				//qDebug() << "start transect";
				var offsetDistance;
				if (transectCount == 1) {
					// Single transect is flown over scan line
					offsetDistance = 0;
				} else {
					// Convert from normalized to absolute transect offset distance
					offsetDistance = halfWidth - normalizedTransectPosition;
				}

				// Turn transect into CoordInfo transect
				var transect = new Array(_CoordInfo);
				transect.shift();
				//QList<QGeoCoordinate> transectCoords = _corridorPolyline.offsetPolyline(offsetDistance);
				var transectCoords = offsetPolyline(this._corridorPolyline, offsetDistance);
				for (var j = 1; j < transectCoords.points.length - 1; j++) {
					var coordInfo = new _CoordInfo()
					coordInfo.coord = transectCoords.points[j];
					coordInfo.type = CoordType.CoordTypeInterior;
					transect.push(coordInfo);
				}
				var coordInfo1 = new _CoordInfo()
				coordInfo1.coord = transectCoords.points[transectCoords.points.length - 1];
				coordInfo1.type = CoordType.CoordTypeSurveyEdge;//{ transectCoords.first(), CoordTypeSurveyEdge };
				transect.unshift(coordInfo1);
				var coordInfo2 = new _CoordInfo();
				coordInfo2.coord = transectCoords.points[transectCoords.points.length - 1];
				coordInfo2.type = CoordType.CoordTypeSurveyEdge;
				//coordInfo = { transectCoords.last(), CoordTypeSurveyEdge };
				transect.push(coordInfo2);

				// Extend the transect ends for turnaround
				if (this.transects.turnAroundDist > 0) {
					//QGeoCoordinate turnaroundCoord;
					var turnAroundDistance = this.transects.turnAroundDistance;

					var azimuth = azimuthTo(transectCoords.points[0], transectCoords.points[1]);
					var turnaroundCoord1 = atDistanceAndAzimuth(transectCoords.points[0], -turnAroundDistance, azimuth);
					//turnaroundCoord.setAltitude(qQNaN());
					var coordInfo3 = new _CoordInfo();
					coordInfo3.coord = turnaroundCoord1;
					coordInfo3.type = CoordType.CoordTypeTurnaround;
					transect.unshift(coordInfo3);

					azimuth = azimuthTo(transectCoords.points[transectCoords.points.length - 1], transectCoords.points[transectCoords.points.length - 2]);
					var transectCoords = atDistanceAndAzimuth(transectCoords.points[transectCoords.points.length - 1], -turnAroundDistance, azimuth);
					//transectCoords.setAltitude(qQNaN());
					var coordInfo4 = new _CoordInfo();
					coordInfo4.coord = transectCoords;
					coordInfo4.type = CoordType.CoordTypeTurnaround;
					transect.push(coordInfo4);
				}

				if (0) { // for debug
					console.log("transect debug");
					//foreach (const TransectStyleComplexItem::CoordInfo_t& coordInfo, transect) {
					//	qDebug() << coordInfo.coordType;
					//}
				}

				this._transects.push(transect);
				normalizedTransectPosition += transectSpacing;
			}

			// Now deal with fixing up the entry point:
			//  0: Leave alone
			//  1: Start at same end, opposite side of center
			//  2: Start at opposite end, same side
			//  3: Start at opposite end, opposite side

			var reverseTransects = false;
			var reverseVertices = false;
			switch (this._entryPoint) {

				case 0:
					reverseTransects = false;
					reverseVertices = false;
					break;
				case 1:
					reverseTransects = true;
					reverseVertices = false;
					break;
				case 2:
					reverseTransects = false;
					reverseVertices = true;
					break;
				case 3:
					reverseTransects = true;
					reverseVertices = true;
					break;
			}
			if (reverseTransects) {
				var reversedTransects = new Array;
				reversedTransects.shift();

				for (var ks = 0; ks < this._transects.length; ++ks) {
					reversedTransects.unshift(this._transects[ks]);
				}
				//foreach (const QList<TransectStyleComplexItem::CoordInfo_t>& transect, _transects) {
				//	reversedTransects.prepend(transect);
				//}
				this._transects = reversedTransects;
			}
			if (reverseVertices) {
				for (var i = 0; i < this._transects.length; i++) {
					//QList<TransectStyleComplexItem::CoordInfo_t> reversedVertices;
					var reversedVertices = new Array();
					reversedVertices.shift();
					for (var ks = 0; ks < this._transects[i].count(); ++i) {
						reversedVertices.unshift(this._transects[i][ks]);
					}
					//foreach (const TransectStyleComplexItem::CoordInfo_t& vertex, _transects[i]) {
					//						reversedVertices.prepend(vertex);
					//					}
					this._transects[i] = reversedVertices;
				}
			}

			// Adjust to lawnmower pattern
			reverseVertices = false;
			for (var i = 0; i < this._transects.length; i++) {
				// We must reverse the vertices for every other transect in order to make a lawnmower pattern
				//QList<TransectStyleComplexItem::CoordInfo_t> transectVertices = _transects[i];
				var transectVertices = this._transects[i];
				if (reverseVertices) {
					reverseVertices = false;
					//QList<TransectStyleComplexItem::CoordInfo_t> reversedVertices;
					var reversedVertices;
					for (var j = transectVertices.count() - 1; j >= 0; j--) {
						reversedVertices.append(transectVertices[j]);
					}
					transectVertices = reversedVertices;
				} else {
					reverseVertices = true;
				}
				this._transects[i] = transectVertices;
			}
		}
	}

	CorridorScanComplexItem.prototype._rebuildTransectsPhase2 = function () {
		console.log("SurveyComplexItem _rebuildTransectsPhase2");
		this._visualTransectPoints = new Array(_Point)
		this._visualTransectPoints.shift();

		for (var indi = 0; indi < this._transects.length; indi++) {
			var transect = this._transects[indi];
			for (var indj = 0; indj < transect.length; indj++) {
				this._visualTransectPoints.push(transect[indj]);
			}
		}
		// Calculate distance flown for complex item
		this.statistic.flyDist = 0;
		for (var i = 0; i < this._visualTransectPoints.length - 1; i++) {
			this.statistic.flyDist += distanceTo(this._visualTransectPoints[i], this._visualTransectPoints[i + 1]);
		}

		if (this.transects.imgInTurnAround) {
			this.statistic.photoCount = Math.ceil(this.statistic.flyDist / this.cameraCalc.AdjustedFootprintFrontal);
		} else {
			// FIXIT
			var tmpp1 = this._corridorPolyline.p1;
			var tmpp2 = this._corridorPolyline.p2;
			var singleTransectImageCount = Math.ceil(distanceTo(tmpp1, tmpp2) / this.cameraCalc.AdjustedFootprintFrontal);
			this.statistic.photoCount = singleTransectImageCount * this._transectCount.length;
		}

		this._coordinate = this._visualTransectPoints.length ? this._visualTransectPoints[0] : new _Point(0, 0, 0);
		this._exitCoordinate = this._visualTransectPoints.length ? this._visualTransectPoints[this._visualTransectPoints.length - 1] : new _Point(0, 0, 0);
	}

	CorridorScanComplexItem.prototype.setViewPort = function (coord, width, height, isMec = false) {
		console.log("Setting view port.")
		this._corridorPolyline = addInitionalPolyline(coord, width, height, isMec)
	}

	window.CorridorScanComplexItem = CorridorScanComplexItem;
})();

