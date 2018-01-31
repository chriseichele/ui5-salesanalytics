sap.ui.define([
		"de/tum/in/i17/leonardo/ws1718/salesanalytics/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History"
	], function (BaseController, JSONModel, History) {
    "use strict";

    return BaseController.extend("de.tum.in.i17.leonardo.ws1718.salesanalytics.controller.App", {

        onInit: function () {
			
            var oViewModel;
            var iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

            oViewModel = new JSONModel({
                busy: true,
                delay: 0
            });
            this.setModel(oViewModel, "appView");

            // apply content density mode to root view
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

            return new Promise(function (fnResolve) {
                var oModel, aPromises = [];
                oModel = this.getOwnerComponent().getModel("sales");
                aPromises.push(oModel.metadataLoaded);
                return Promise.all(aPromises).then(function () {
                    oViewModel.setProperty("/busy", false);
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                    fnResolve();
                });
            }.bind(this));
        }
    });
});
