/*global history */
sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/routing/History",
		"de/tum/in/i17/leonardo/ws1718/salesanalytics/model/formatter",
		"de/tum/in/i17/leonardo/ws1718/salesanalytics/model/grouper"
	], function (Controller, History, formatter, grouper) {
    "use strict";

    return Controller.extend("de.tum.in.i17.leonardo.ws1718.salesanalytics.controller.BaseController", {
        
        // include formatter and grouper help functions to make them available everywhere
        formatter: formatter,
        grouper: grouper,
        
        // store current language as character, like it is used in the backend system
        sLANGU: sap.ui.getCore().getConfiguration().getLanguage().toUpperCase().substring(0,1),
        
        /**
         * Convenience method for accessing the router in every controller of the application.
         * @public
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Convenience method for getting the view model by name in every controller of the application.
         * @public
         * @param {string} sName the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model in every controller of the application.
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Convenience method for getting the resource bundle.
         * @public
         * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Event handler  for navigating back.
         * It checks if there is a history entry. If yes, history.go(-1) will happen.
         * If not, it will replace the current entry of the browser history with the master route.
         * @public
         */
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();

            if (sPreviousHash !== undefined) {
                // The history contains a previous entry
                history.go(-1);
            } else {
                // Otherwise we go backwards with a forward history
                var bReplace = true;
                this.getRouter().navTo("default", {}, bReplace);
            }
        },
		
		onSharePress: function() {
			let oShareSheet = this.byId("shareSheet");
			oShareSheet.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			oShareSheet.openBy(this.byId("shareButton"));
		},
		
		onShareNativePress: function() {
		    if (navigator.share) {
                navigator.share({
                    title: "",
                    text: "",
                    url: window.location.href
                });
            }
		},
		onShareEmailPress: function() {
		    let sSubject = this.oModel.getProperty("/shareSendEmailSubject");
		    let sMessage = this.oModel.getProperty("/shareSendEmailMessage");
		    if(!sMessage){sMessage = window.location.href;}
			sap.m.URLHelper.triggerEmail(
				null,
				sSubject,
				sMessage
			);
		},
		onShareInJamPress: function() {
			let oShareDialog = sap.ui.getCore().createComponent({
				name: "sap.collaboration.components.fiori.sharing.dialog",
				settings: {
					object: {
						id: location.href,
						share: this.oModel.getProperty("/shareOnJamTitle")
					}
				}
			});
			oShareDialog.open();
		},
        
        getSalesOrgText: function(sSalesOrg, callback) {
            let sSalesOrgKey = "/SalesOrg(SALES_ORGANISATION='" + sSalesOrg + "',LANGU='" + this.sLANGU + "')";
            let oSalesModel = this.getModel("sales");
            if(oSalesModel.getProperty(sSalesOrgKey)) {
                callback(oSalesModel.getProperty(sSalesOrgKey).SHORT_TEXT);
            } else {
                oSalesModel.read(sSalesOrgKey, {
                        success: function(oTooltipObject){ 
                            callback(oTooltipObject.SHORT_TEXT); 
                        }.bind(this)
                } );
            }
        }

    });

});
