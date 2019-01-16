/**
 * 
 */

(function() {

	var StructureScanComplexItem = function(options) {
		this.options = options;
		this. _flightPolygon = new _Polygon();
		this._structurePolygon = new _Polygon();
		this._cameraShots = 0;
		this._layers = 0;
	};

	StructureScanComplexItem.prototype = new TransectStyleComplexItem();
	StructureScanComplexItem.prototype.name = 'StructureScanComplexItem';

	StructureScanComplexItem.prototype._rebuildTransectsPhase1 = function(refly = false) {
		console.log("StructureScanComplexItem _rebuildTransectsPhase1");
	}

	StructureScanComplexItem.prototype._rebuildTransectsPhase2 = function() {
		console.log("StructureScanComplexItem _rebuildTransectsPhase1");
	}

	StructureScanComplexItem.prototype._rebuildFlightPolygon = function()
	{
		this._flightPolygon = this._structurePolygon
		this._flightPolygon.offset(this.camera.DistanceToSurface);;
	}

	StructureScanComplexItem.prototype._recalcCameraShots()
	{
		if (this._flightPolygon.points < 3) {
			this._cameraShots = 0;
			return;
		}

		// Determine the distance for each polygon traverse
		var distance = 0;
		for (var i=0; i<_flightPolygon.count(); i++) {
			var coord1 = _flightPolygon.vertexCoordinate(i);
			var coord2 = _flightPolygon.vertexCoordinate(i + 1 == _flightPolygon.count() ? 0 : i + 1);
			distance += coord1.distanceTo(coord2);
		}
		if (distance == 0.0) {
			this._cameraShots = 0;
			return;
		}

		var cameraShots = distance / this.cameraCalc.AdjustedFootprintSide;
		this._cameraShots = cameraShots * this._layers;
	}

	StructureScanComplexItem.prototype.setLayers = function(layers)
	{
		this._layers = layers;
	}

	SurveyComplexItem.prototype.setViewPort = function (coord, width, height, isMec) {
		console.log("Setting view port.")
		this._surveyAreaPolygon = calcPolygonCornor(coord, width, height, 100, isMec)
	}

	window.StructureScanComplexItem = StructureScanComplexItem;
})();
