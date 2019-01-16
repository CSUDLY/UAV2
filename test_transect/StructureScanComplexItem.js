/**
 * 
 */

(function () {

	var StructureScanComplexItem = function (options) {
		TransectStyleComplexItem.call(this, TransectOptions);
		this._flightPolygon = new _Polygon();
		this._cameraShots = 0;
		this._layers = 1;
		this._scanDistance = 10;
	};

	StructureScanComplexItem.prototype = new TransectStyleComplexItem(TransectOptions);
	StructureScanComplexItem.prototype.name = 'StructureScanComplexItem';

	StructureScanComplexItem.prototype._rebuildTransectsPhase1 = function (refly = false) {
		console.log("StructureScanComplexItem _rebuildTransectsPhase1");
		this._rebuildFlightPolygon();
	}

	StructureScanComplexItem.prototype._rebuildTransectsPhase2 = function () {
		console.log("StructureScanComplexItem _rebuildTransectsPhase1");
		this._recalcCameraShots();
	}

	StructureScanComplexItem.prototype._rebuildFlightPolygon = function () {

		// Debug..
		/*	this._surveyAreaPolygon = new _Polygon;
			this._surveyAreaPolygon.points.push(new _Point(116.2799428567, 40.0156040666, 0));
			this._surveyAreaPolygon.points.push(new _Point(116.2811170970, 40.0156040666, 0));
			this._surveyAreaPolygon.points.push(new _Point(116.2811170970, 40.0147047460, 0));
			this._surveyAreaPolygon.points.push(new _Point(116.2799428567, 40.0147047460, 0)); */
		this._flightPolygon = this._surveyAreaPolygon
		this._flightPolygon.offset(this._scanDistance);;
	}

	StructureScanComplexItem.prototype._recalcCameraShots = function () {
		if (this._flightPolygon.points.length < 3) {
			this._cameraShots = 0;
			return;
		}
		this._visualTransectPoints = new Array(_Point)
		this._visualTransectPoints.shift();
		// Determine the distance for each polygon traverse
		var distance = 0;
		for (var i = 0; i < this._flightPolygon.points.length; i++) {
			this._visualTransectPoints.push(this._flightPolygon.vertexCoordinate(i));
			var coord1 = this._flightPolygon.vertexCoordinate(i);
			var coord2 = this._flightPolygon.vertexCoordinate(i + 1 == this._flightPolygon.points.length ? 0 : i + 1);
			distance += coord1.distanceTo(coord2);
		}
		if (distance == 0.0) {
			this._cameraShots = 0;
			return;
		}

		this._coordinate = this._flightPolygon.vertexCoordinate(0);
		this._exitCoordinate = this._flightPolygon.vertexCoordinate(0);

		var cameraShots = distance / this.cameraCalc.AdjustedFootprintSide;
		this._cameraShots = cameraShots * this._layers;
	}

	StructureScanComplexItem.prototype.setLayers = function (layers) {
		this._layers = layers;
	}

	StructureScanComplexItem.prototype.setScanDistance = function (scanDistance) {
		this._scanDistance = scanDistance;
		this.rebuildTransects();
	}

	StructureScanComplexItem.prototype.setViewPort = function (coord, width, height, isMec) {
		console.log("Setting view port.")
		this._surveyAreaPolygon = calcPolygonCornor(coord, width, height, 100, isMec)
	}

	StructureScanComplexItem.prototype.buildMissionItemToJson = function (index = 0) {


		var itemlist = new Array(_ItemCase);
		itemlist.shift();

		var item1 = new _ItemCase(index++,
			196,
			2,
			0, 0, 0, 0,                         // param 1-4 not used
			0, 0,                               // Pitch and Roll stay in standard orientation
			90,                                 // 90 degreee yaw offset to point to structure
			true,                               // autoContinue
			false,                              // isCurrentItem
			"ComplexItem");

		itemlist.push(item1);

		for (var layer = 0; layer < this._layers; layer++) {
			var addTriggerStart = true;
			// baseAltitude is the bottom of the first layer. Hence we need to move up half the distance of the camera footprint to center the camera
			// within the layer.
			var layerAltitude = this.cameraCalc.AdjustedFootprintSide + (this.cameraCalc.AdjustedFootprintFrontal / 2.0) + (layer * this.cameraCalc.AdjustedFootprintFrontal);

			for (var i = 0; i < this._flightPolygon.points.length; i++) {
				var vertexCoord = this._flightPolygon.points[i];

				var tmpItem = new _ItemCase(index++,
					16,
				this.transects.relativeAltitude ? 3 : 0,
					0,                                          // No hold time
					0.0,                                        // No acceptance radius specified
					0.0,                                        // Pass through waypoint
					90, //std::numeric_limits<double>::quiet_NaN(),   // Yaw unchanged
				vertexCoord.lat,
				vertexCoord.lng,
					layerAltitude,
					true,                                       // autoContinue
					false,                                      // isCurrentItem
					"ComplexItem");//

				itemlist.push(tmpItem);

				if (addTriggerStart) {
					addTriggerStart = false;
					var tmpItem1 = new _ItemCase(index++,
						206,
						2,
					this.cameraCalc.AdjustedFootprintSide,  // trigger distance
						0,                                                           // shutter integration (ignore)
						1,                                                           // trigger immediately when starting
						0, 0, 0, 0,                                                  // param 4-7 unused
						true,                                                        // autoContinue
						false,                                                       // isCurrentItem
						"ComplexItem");
					itemlist.push(tmpItem1);
				}
			}

			var vertexCoord = this._flightPolygon.points[0];

			var item3 = new _ItemCase(index++,
				16,
			this.transects.relativeAltitude ? 3 : 0,
				0,                                          // No hold time
				0.0,                                        // No acceptance radius specified
				0.0,                                        // Pass through waypoint
				0,   // Yaw unchanged
			vertexCoord.lat,
			vertexCoord.lng,
				layerAltitude,
				true,                                       // autoContinue
				false,                                      // isCurrentItem
				"ComplexItem");
			itemlist.push(item3);

			var item4 = new _ItemCase(index++,
				206,
				2,
				0,           // stop triggering
				0,           // shutter integration (ignore)
				0,           // trigger immediately when starting
				0, 0, 0, 0,  // param 4-7 unused
				true,        // autoContinue
				false,       // isCurrentItem
				"ComplexItem")
			itemlist.push[item4];
		}

		var item5 = new _ItemCase(index++,
			197,
			2,
			0, 0, 0, 0, 0, 0, 0,                 // param 1-7 not used
			true,                               // autoContinue
			false,                              // isCurrentItem
			"ComplexItem");

		itemlist.push(item5);

		return JSON.stringify(itemlist);
	}

	window.StructureScanComplexItem = StructureScanComplexItem;
})();
