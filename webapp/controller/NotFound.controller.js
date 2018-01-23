/*global history */
sap.ui.define([
	"de/tum/in/i17/leonardo/ws1718/salesanalytics/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("de.tum.in.i17.leonardo.ws1718.salesanalytics.controller.NotFound", {
        
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
            this.oModel = new JSONModel();
			this.oModel.setData({"hasMaster": !!this.getRouter().getRoute("default")});
            this.setModel(this.oModel);
		}
		
	});

});