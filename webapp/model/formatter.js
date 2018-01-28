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
		
		revenueColor: function(iRevenue) {
		    
            let iRevenueMin = this.oModel.getProperty("/Legend/Revenue/Min");
		    
		    /* set color based on revenue */
            let iRevenueCurrentAboveMin = iRevenue - iRevenueMin;
            switch (true) {
              case (iRevenueCurrentAboveMin < this.oModel.getProperty("/Legend/Revenue/1")):
                return this.oModel.getProperty("/Legend/Color/Now/1");
              case (iRevenueCurrentAboveMin < this.oModel.getProperty("/Legend/Revenue/2")):
                return this.oModel.getProperty("/Legend/Color/Now/2");
              case (iRevenueCurrentAboveMin < this.oModel.getProperty("/Legend/Revenue/3")):
                return this.oModel.getProperty("/Legend/Color/Now/3");
              default:
                return this.oModel.getProperty("/Legend/Color/Now/4");
            }
		}
	};

});