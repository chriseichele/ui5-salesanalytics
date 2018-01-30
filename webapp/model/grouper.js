sap.ui.define([], function() {
	"use strict";

	return {

		getProductListGroup: function (oGroup){
		    let sTitle = oGroup.key;
		    this.getSalesOrgText(oGroup.key, function(s){sTitle = s;});
		    return new sap.m.GroupHeaderListItem( {
				title: sTitle,
				upperCase: false
			} );
		}
		
	};

});