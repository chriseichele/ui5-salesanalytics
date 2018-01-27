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
		}
	};

});