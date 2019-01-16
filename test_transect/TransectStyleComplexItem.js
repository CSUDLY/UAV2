/**
 * 横断面复杂任务项
 */

(function () {

	var TransectStyleComplexItem = function (options) {
		// 巡航区域的面.
		this.surveyAreaPolygon = null
		// Camera
		this.cameraCalc = new _CameraCalc();
		// FIXIT: 这里是否所有的变量都包含在cameraCalc中？
		this.camera = new Object();
		this.camera.altitude = options.camera.altitude || 50
		this.camera.triggerDist = options.camera.triggerDist || 25
		this.camera.spacing = options.camera.spacing || 25
		this.camera.DistanceToSurface = 0;

		// Transects
		this.transects = new Object();
		this.transects.angle = options.transects.angle || 0
		this.transects.turnAroundDist = options.transects.turnAroundDist || 10
		this.transects.hoverAndCapture = options.transects.hoverAndCapture || false
		this.transects.reflyAtNTDegOffset = options.transects.reflyAtNTDegOffset || false
		this.transects.imgInTurnAround = options.transects.imgInTurnAround || true
		this.transects.relativeAltitude = options.transects.relativeAltitude || true

		// Terrain
		this.terrain = new Object();
		this.terrain.vehicleFllowTerrain = options.transects.vehicleFllowTerrain || false

		// Statistics
		this.statistic = new Object();
		this.statistic.surveyArea = 0
		this.statistic.photoCount = 0
		this.statistic.photoInterval = 0
		this.statistic.triggerDist = this.camera.triggerDist
		this.statistic.flyDist = 0; // 飞行距离

		// Members
		this._flySpeed = 5;// m/s
		this._wayPtAlt = 50;
		this._transectsPathHeightInfo = null;
		this._visualTransectPoints = null;
		this._surveyAreaPolygon = null;//new _Polygon();
		//this._centerCoord = new _Point(0, 0, 0);
		this._coordinate = null;//new _Point(0, 0, 0); //entry point 
		this._exitCoordinate = null;//new _Point(0, 0, 0); // exit point
		this._transects = null;//new Array(); // fly path

		// FIXIT
		this._flyAlternateTransectsFactBool = 0
		this._loadedMissionItemsParent = false;
		this._loadedMissionItems = null;
	};


	TransectStyleComplexItem.prototype.rebuildTransects = function (refly = false) {
		this._rebuildTransectsPhase1(refly);
		this._rebuildTransectsPhase2();
	}

	TransectStyleComplexItem.prototype._rebuildTransectsPhase1 = function (refly = false) {
		console.log("TransectStyleComplexItem _rebuildTransectsPhase1");
	}

	TransectStyleComplexItem.prototype._rebuildTransectsPhase2 = function () {
		console.log("TransectStyleComplexItem _rebuildTransectsPhase2");
	}

	TransectStyleComplexItem.prototype.setViewPort = function (coord, width, height, isMec = false) {
		console.log("Setting view port.")
		this._surveyAreaPolygon = calcPolygonCornor(coord, width, height, isMec)
	}

	TransectStyleComplexItem.prototype.buildMissionItemToJson = function (index = 0) {
		console.log("Build Mission Item To Json.")
	}

	TransectStyleComplexItem.prototype.CameraCalc = function () {
		if (this.cameraCalc == null) {
			this.cameraCalc = new _CameraCalc();
			return this.cameraCalc;
		}
	}

	TransectStyleComplexItem.prototype.getFlyPath = function () {
		return this._visualTransectPoints;
	}

	TransectStyleComplexItem.prototype.getStatistics = function () {
		return {
			"SurveyArea": this.statistic.surveyArea,
			"PhotoNum": this.statistic.photoCount,
			"PhotoInterval": this.statistic.photoInterval,
			"TriggerDist": this.statistic.triggerDist,
			"FlyDist": this.statistic.flyDist
		}
	}

	TransectStyleComplexItem.prototype.setSelfDefineAreaPoints = function (points) {
		if (this._surveyAreaPolygon == null) {
			this._surveyAreaPolygon = new _Polygon();
		}
		this._surveyAreaPolygon.points = points;
		this.rebuildTransects();
	}

	TransectStyleComplexItem.prototype.getAreaPoints = function () {
		return this._surveyAreaPolygon.points;
	}

	TransectStyleComplexItem.prototype.getEntryExitPoint = function () {
		return [this._coordinate.coord, this._exitCoordinate.coord];
	}

	// 控制参数修改   
	// 角度
	TransectStyleComplexItem.prototype.updateAngle = function (newAngle) {
		this.transects.angle = newAngle;
		this.rebuildTransects();
	}
	// 高度
	TransectStyleComplexItem.prototype.updateAltitude = function (altitude) {
		this.camera.altitude = altitude;
		this.rebuildTransects();
	}
	// 拍照距离
	TransectStyleComplexItem.prototype.updateTriggerDist = function (trigger) {
		this.camera.triggerDist = trigger;
		this.rebuildTransects();
	}
	// space
	TransectStyleComplexItem.prototype.updateSpace = function (spacing) {
		this.camera.spacing = spacing;
		this.rebuildTransects();
	}
	
	// 转向距离
	TransectStyleComplexItem.prototype.updateTurnAroundDist = function (trunAroundDist) {
		this.transects.turnAroundDist = trunAroundDist;
		this.rebuildTransects();
	}

	// hoverAndCapture固定拍照?
	TransectStyleComplexItem.prototype.updateHoverAndCap = function (hoverAndCap) {
		this.transects.hoverAndCapture = hoverAndCap;
		this.rebuildTransects();
	}

	// refly degree offset 重飞角度偏移
	TransectStyleComplexItem.prototype.updateReflyAtNtDegOffset = function (degOffset) {
		this.transects.reflyAtNTDegOffset = degOffset;
		this.rebuildTransects();
	}

	// 转向
	TransectStyleComplexItem.prototype.updateInTurnAround = function (inTurnAround) {
		this.transects.imgInTurnAround = inTurnAround;
		this.rebuildTransects();
	}

	// 相对高度
	TransectStyleComplexItem.prototype.updateRelativeAltitude = function (relativeAltitude) {
		this.transects.relativeAltitude = relativeAltitude;
		this.rebuildTransects();
	}

	// terrain
	TransectStyleComplexItem.prototype.updateFollowTerrain = function (followTerrain) {
		this.terrain.vehicleFllowTerrain = followTerrain;
		this.rebuildTransects();
	}

	//
	TransectStyleComplexItem.prototype.rotatePoint = function () {
		if (this._surveyAreaPolygon == null || this._surveyAreaPolygon == undefined || this._surveyAreaPolygon.points.length == 0) return;

		var lastPoint = this._surveyAreaPolygon.points.pop();
		this._surveyAreaPolygon.unshift(lastPoint);
		this.rebuildTransects();
	}

	window.TransectStyleComplexItem = TransectStyleComplexItem;
})();
