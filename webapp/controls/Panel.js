/* CUSTOM CONTROL EXPANDING STANDARD PANEL CONTROL */

sap.ui.define(
    ["sap/m/Panel"],
	function(Panel) {
		return Panel.extend("de.tum.in.i17.leonardo.ws1718.salesanalytics.controls.Panel", {
			
			renderer: function(oRm, oControl) {
				sap.m.PanelRenderer.render(oRm, oControl); //use supercass renderer routine
			},
			
			init: function() {
				let me = this;
				this.attachBrowserEvent("click",
					function attachPanelHeaderClick(oEvent) {
						me._onPanelHeaderClick(oEvent, this);
					});

				//execute standard control methods
				sap.m.Panel.prototype.init.apply(this, arguments);
			},

			_onPanelHeaderClick: function(oEvent, oElement) {
                
				/* The default panel control can only expand with the tiny button at the header start */
				/* Increase usability by enabling collapse/expand also on simple click on the whole panel header */
			    
			    var isInToolbar = false;
			    var e = oEvent.toElement;
                while (e && e.parentNode) {
                    if (e.id.indexOf("__toolbar") > -1 || e.id.indexOf("-header") > -1 ){
                        // the clicked element is child element of the panel's toolbar
                        isInToolbar = true;
                        break;
                    }
                    e = e.parentNode;
                }
                
				if (!!oEvent.toElement && isInToolbar ) {
					if (oElement.getExpanded() === true) {
						oElement.setExpanded(false);
					} else {
						oElement.setExpanded(true);
					}
				}
			}

		});
	}
);