sap.ui.define([], function() {
	"use strict";

	return {

		/**
		 * Returns a configuration object for the {@link sap.ushell.ui.footerbar.AddBookMarkButton} "appData" property
		 * @public
		 * @param {string} sTitle the title for the "save as tile" dialog
		 * @returns {object} the configuration object
		 */
		shareTileData: function(sTitle) {
			return {
				title: sTitle
			};
		},
		
		month: function(iMonth) {
		    let locale = sap.ui.getCore().getConfiguration().getLanguage();
		    let d = new Date();
		    d.setMonth(iMonth - 1);
			return d.toLocaleString(locale, {month: "long"});
		},
		
		setEmptyText: function(sText) {
		    if(!sText || sText === "0") {
		        return this.getResourceBundle().getText("unclassified");
		    } else {
		        return sText;
		    }
		},
		
		revenueColor: function(iRevenue, bPredicted) {
            let iRevenueMin = this.oModel.getProperty("/Legend/Revenue/Min");
		    /* set color based on revenue */
            let iRevenueCurrentAboveMin = iRevenue - iRevenueMin;
            switch (true) {
              case (iRevenueCurrentAboveMin < this.oModel.getProperty("/Legend/Revenue/1")):
                if(!bPredicted) {
                    return this.oModel.getProperty("/Legend/Color/Now/1");
                } else {
                    return this.oModel.getProperty("/Legend/Color/Predicted/1");
                }
                break;
              case (iRevenueCurrentAboveMin < this.oModel.getProperty("/Legend/Revenue/2")):
                if(!bPredicted) {
                    return this.oModel.getProperty("/Legend/Color/Now/2");
                } else {
                    return this.oModel.getProperty("/Legend/Color/Predicted/2");
                }
                break;
              case (iRevenueCurrentAboveMin < this.oModel.getProperty("/Legend/Revenue/3")):
                if(!bPredicted) {
                    return this.oModel.getProperty("/Legend/Color/Now/3");
                } else {
                    return this.oModel.getProperty("/Legend/Color/Predicted/3");
                }
                break;
              case (iRevenueCurrentAboveMin < this.oModel.getProperty("/Legend/Revenue/4")):
                if(!bPredicted) {
                    return this.oModel.getProperty("/Legend/Color/Now/4");
                } else {
                    return this.oModel.getProperty("/Legend/Color/Predicted/4");
                }
                break;
              default:
                if(!bPredicted) {
                    return this.oModel.getProperty("/Legend/Color/Now/4");
                } else {
                    return this.oModel.getProperty("/Legend/Color/Predicted/5");
                }
            }
		},
		revenueColorNow: function(iRevenue) {
		    let getRevenueColor = this.formatter.revenueColor.bind(this);
		    return getRevenueColor(iRevenue, false);
		},
		revenueColorPredicted: function(iRevenue) {
		    let getRevenueColor = this.formatter.revenueColor.bind(this);
		    return getRevenueColor(iRevenue, true);
		}
	};

});