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
		
		canShareNative: function() {
		    // checks if native share function is active (common on mobile devices)
		    return !!navigator && !!navigator.share;
		},
		
		month: function(iMonth) {
		    // returns month string based on month number (1-12)
		    let locale = sap.ui.getCore().getConfiguration().getLanguage();
		    let d = new Date();
		    d.setMonth(iMonth - 1);
			return d.toLocaleString(locale, {month: "long"});
		},
		
		formatDateYearMonth : function(v) {
		    // format date with month text and full year
            var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({pattern: "MMM YYYY"});
            return oDateFormat.format(new Date(v));
		},
		
		salesOrg: function(sKey) {
		    // return sales organisation text
		    let sTitle = sKey;
		    if(this.getSalesOrgText) {
		        // function is configured in base controller
		        this.getSalesOrgText(sKey, function(s){sTitle = s;});
		    }
		    return sTitle;
		},
		
		setEmptyText: function(sText) {
		    // return text to display instead of empty value
		    if(!sText || sText === "0") {
		        return this.getResourceBundle().getText("unclassified");
		    } else {
		        return sText;
		    }
		},
		
		revenueColor: function(iRevenue, bPredicted) {
		    // set color based on revenue
		    // different colors for predicted and existing values
            let iRevenueMin = this.oModel.getProperty("/Legend/Revenue/Min");
            let iRevenueCurrentAboveMin = iRevenue - iRevenueMin;
            // get color for revenue category
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