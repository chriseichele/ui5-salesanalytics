/*global history */
sap.ui.define([
	    "de/tum/in/i17/leonardo/ws1718/salesanalytics/controller/BaseController",
        "sap/ui/vbm/AnalyticMap",
        "sap/ui/model/json/JSONModel",
	    "sap/ui/model/Filter",
        "sap/ui/Device"
    ], function(BaseController, AnalyticMap, JSONModel, Filter, Device) {
	"use strict";

	//AnalyticMap.GeoJSONURL = "https://sapui5.netweaver.ondemand.com/1.50.8/test-resources/sap/ui/vbm/demokit/media/analyticmap/L0.json";
	AnalyticMap.GeoJSONURL = "/gbi-student-006/SalesDataAnalytics/model/requestSalesOrg.xsjs";

	return BaseController.extend("de.tum.in.i17.leonardo.ws1718.salesanalytics.controller.Map", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function() {
            this.oModel = new JSONModel();
			this.oModel.setData({"pageTitle": this.getResourceBundle().getText("mapViewTitle")});
            this.setModel(this.oModel);

			this.oSliderTimeframe = this.getSelect("slTimeframe");
			this.oSelectSalesOrg = this.getSelect("slSalesOrganisation");
			this.oSelectProductCategory = this.getSelect("slProductCategory");
			this.oSelectProductGroup = this.getSelect("slProductGroup");
			this.aKeys = ["SalesArea", "ProductCategory", "ProductGroup"];
			//this.aKeys = 
		    //let test = this.getView().byId("FilterBar").getAllFilterItems();
		    
			this.oModel.setProperty("/Filter", { "text" : this.getFormattedSummaryText([]) });
			this.addSnappedLabel();
			
			/* sales areas */
		    this.oAreasModel = new JSONModel("/gbi-student-006/SalesDataAnalytics/model/requestSalesOrg.xsjs");
		    this.setModel(this.oAreasModel, "mapSalesAreasData");
		    let me = this;
		    me.oAreasModel.attachRequestCompleted(function() {
		        /* stringyfy coordinates into shape for map */
                me.oAreasModel.getProperty("/features/").forEach(function(feature,i){
                    let shape = "";
                    feature.geometry.coordinates.pop().forEach(function(coor){
                        let x = coor.pop();
                        let y = coor.pop();
                        shape = shape + y + ";" + x + ";0;";
                    });
                    shape = shape.substring(0, shape.length - 1);
                    me.oAreasModel.setProperty("/features/" + i + "/geometry/shape",shape);
                    me.oAreasModel.setProperty("/features/" + i + "/colors",{"content":"rgba(92,186,230,0.6)","border":"rgba(92,186,230,0.8)","hover":"RHLSA(0;1.1;1.0;1.0)"});
                });
            });
			
			/* init time slider */
			let iYearStart = 2007;
			let iYearEnd = 2011;
			let iYearNow = new Date().getFullYear();
			let iYearsForecast = 3;
			this.oSliderTimeframe.setMinDate(new Date(Date.UTC(iYearStart, 0, 1)));
			if(iYearNow > iYearEnd) {
			    this.oSliderTimeframe.setMaxDate(new Date(Date.UTC(iYearNow + 1 + iYearsForecast, 0, 0)));
			} else {
			    this.oSliderTimeframe.setMaxDate(new Date(Date.UTC(iYearEnd + 1 + iYearsForecast, 0, 0)));
			}
			this.oSliderTimeframe.setStartDate(this.oSliderTimeframe.getMinDate());
			this.oSliderTimeframe.addSelectedDate(new sap.ui.unified.DateRange({"startDate":this.oSliderTimeframe.getStartDate()}));
            
            /* configure geo map */
			this.configureGeoMap();
		},

		onExit : function () {
			if (this._oPopover) {
				this._oPopover.destroy();
			}
			
			this.oModel = null;
			this.aKeys = [];
			this.aFilters = [];
		},
		
		onToggleHeader: function () {
			this.getPage().setHeaderExpanded(!this.getPage().getHeaderExpanded());
		},
		
		onToggleFooter : function () {
			this.getPage().setShowFooter(!this.getPage().getShowFooter());
		},
		
		onSelectChange: function() {
			var aCurrentFilterValues = [];

			//aCurrentFilterValues.push(this.getSelectedItemText(this.oSelectSalesOrg));
			aCurrentFilterValues.push(this.oSelectSalesOrg.getSelectedItems());
			aCurrentFilterValues.push(this.getSelectedItemText(this.oSelectProductCategory));
			aCurrentFilterValues.push(this.getSelectedItemText(this.oSelectProductGroup));

			this.filterMap(aCurrentFilterValues);
		},
		
		onMonthChange: function() {
			sap.m.MessageToast.show(this.oSliderTimeframe.getSelectedDates().pop().getStartDate());
		},

		filterMap: function (aCurrentFilterValues) {
		    //this.oAreasModel.filter(this.getFilters(aCurrentFilterValues));
			//this.getTableItems().filter(this.getFilters(aCurrentFilterValues));
			this.updateFilterCriterias(this.getFilterCriteria(aCurrentFilterValues));
		},

		updateFilterCriterias : function (aFilterCriterias) {
			this.removeSnappedLabel(); /* because in case of label with an empty text, */
			this.addSnappedLabel(); /* a space for the snapped content will be allocated and can lead to title misalignment */
			this.oModel.setProperty("/Filter/text", this.getFormattedSummaryText(aFilterCriterias));
		},

		addSnappedLabel : function() {
			var oSnappedLabel = this.getSnappedLabel();
			oSnappedLabel.attachBrowserEvent("click", this.onToggleHeader, this);
			this.getPageTitle().addSnappedContent(oSnappedLabel);
		},

		removeSnappedLabel : function() {
			this.getPageTitle().destroySnappedContent();
		},

		getFilters: function (aCurrentFilterValues) {
			this.aFilters = [];

			this.aFilters = this.aKeys.map(function (sCriteria, i) {
				return new sap.ui.model.Filter(sCriteria, sap.ui.model.FilterOperator.Contains, aCurrentFilterValues[i]);
			});

			return this.aFilters;
		},
		getFilterCriteria : function (aCurrentFilterValues){
			return this.aKeys.filter(function (el, i) {
				if (aCurrentFilterValues[i] !== "") { 
				    return  el;
			    }
			});
		},
		getFormattedSummaryText : function (aFilterCriterias) {
			if (aFilterCriterias.length > 0) {	
				return this.getResourceBundle().getText("filteredBy") + " (" + aFilterCriterias.length + "): " + aFilterCriterias.join(", ");
			} else {
				return this.getResourceBundle().getText("filteredBy") + " " + this.getResourceBundle().getText("none");
			}
		},

		getSelect : function (sId) {
			return this.getView().byId(sId);
		},
		getSelectedItemText : function (oSelect) {
			return oSelect.getSelectedItem() ? oSelect.getSelectedItem().getKey() : "";
		},
		getPage : function() {
			return this.getView().byId("dynamicMapPage");
		},
		getPageTitle: function() {
			return this.getPage().getTitle();
		},
		getSnappedLabel : function () {
			return new sap.m.Label({text: "{/Filter/text}"});
		},

		/* event handlers for map events */

		onPressLegend: function() {
			if (this.byId("vbi").getLegendVisible() === true) {
				this.byId("vbi").setLegendVisible(false);
				this.byId("btnLegend").setTooltip("Show legend");
			} else {
				this.byId("vbi").setLegendVisible(true);
				this.byId("btnLegend").setTooltip("Hide legend");
			}
		},

		onPressResize: function() {
			if (this.byId("btnResize").getTooltip() === "Minimize") {
				if (sap.ui.Device.system.phone) {
					this.byId("vbi").minimize(132, 56, 1320, 560); //Height: 3,5 rem; Width: 8,25 rem
				} else {
					this.byId("vbi").minimize(168, 72, 1680, 720); //Height: 4,5 rem; Width: 10,5 rem
				}
				this.byId("btnResize").setTooltip("Maximize");
			} else {
				this.byId("vbi").maximize();
				this.byId("btnResize").setTooltip("Minimize");
			}
		},

		onRegionClick: function(oEvent) {
		    console.log("onRegionClick " + oEvent.getParameter("code"));
			sap.m.MessageToast.show(oEvent.oSource.mNames[oEvent.getParameter("code")]);
		},

		onClickCircle: function(oEvent) {
		    /* handle click on data-element on map */
		    /* opens popover with additional information and jump options */
			
			var oClickedElement = oEvent.getSource();  
			
			// create popover
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("de.tum.in.i17.leonardo.ws1718.salesanalytics.view.MapCirclePopover", this);
				this.getView().addDependent(this._oPopover);
			}
			if (this._oPopover) {
				if(oClickedElement.oPropagatedProperties.oBindingContexts.mapData){
				    //this._oPopover.bindElement("mapData>"+oClickedElement.oPropagatedProperties.oBindingContexts.mapData.sPath);
				}
			}

			// delay because addDependent will do a async rerendering and the actionSheet will immediately close without it.
			jQuery.sap.delayedCall(0, this, function () {
    			if(!oClickedElement.bOutput){
    			    /* clicked element is not available in DOM => generate spot to open popover from there */
    			    if(!this._oPopoverIcon){
    			        this._oPopoverIcon = new sap.ui.core.Icon({"src":"sap-icon://overlay","color":"rgb(255,255,255)"});
    			    }
    			    let container = new sap.ui.vbm.Container({"position":oClickedElement.mClickGeoPos,"item":this._oPopoverIcon});
    			    let containers = new sap.ui.vbm.Containers();
    			    containers.addItem(container);
    			    let oMap = oClickedElement;
    			    while (oMap && oMap.getParent) {
    			        oMap = oMap.getParent();
    			        if(oMap instanceof sap.ui.vbm.AnalyticMap || oMap instanceof sap.ui.vbm.GeoMap ) {
    			            break;
    			        }
    			    }
    			    
			        let me = this;
			        this._oPopoverIcon.addEventDelegate({
                        "onAfterRendering": function () {
				            me._oPopover.attachAfterClose(function(){
				                oMap.removeVo(containers);
				            });
                            jQuery.sap.delayedCall(0, this, function () {
				                me._oPopover.openBy(this._oPopoverIcon);
                            });
                         }
                    }, this);
    			    oMap.addVo(containers);
    			} else {
				    this._oPopover.openBy(oClickedElement);
    			}
			});
		},

		/* Navigation */

		gotoPredict: function() {
			this.getRouter().navTo("predict");
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share button has been clicked
		 * @param {sap.ui.base.Event} oEvent the butten press event
		 * @public
		 */
		onSharePress: function() {
			let oShareSheet = this.byId("shareSheet");
			oShareSheet.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			oShareSheet.openBy(this.byId("shareButton"));
		},

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onShareEmailPress: function() {
			sap.m.URLHelper.triggerEmail(
				null,
				this.oModel.getProperty("/shareSendEmailSubject"),
				this.oModel.getProperty("/shareSendEmailMessage") + window.location.href
			);
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function() {
			oShareDialog = sap.ui.getCore().createComponent({
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
		
		/* HELP FUNCTIONS */

        configureGeoMap: function() {
			var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();

			/* geo map configuration */
			var oGeoMap = this.getView().byId("map2");
			var oMapConfig = {
				"MapProvider": [
				    {
					    "name": "OPENSTREET",
					    "copyright": "© Open Street Maps",
					    "Source": [{
						    "id": "s1",
						    "url": "http://tile.openstreetmap.org/{LOD}/{X}/{Y}.png"
                        }]
                    },
				    {
					    "name": "HERE",
					    "copyright": "© HERE Maps",
					    "Source": [{
						    "id": "s1",
						    "url": "http://1.base.maps.cit.api.here.com/maptile/2.1/maptile/newest/normal.day/{LOD}/{X}/{Y}/256/png8?app_id=DemoAppId01082013GAL&app_code=AJKnXv84fjrb0KIHawS0Tg"
                        },{
						    "id": "s2",
						    "url": "http://2.base.maps.cit.api.here.com/maptile/2.1/maptile/newest/normal.day/{LOD}/{X}/{Y}/256/png8?app_id=DemoAppId01082013GAL&app_code=AJKnXv84fjrb0KIHawS0Tg"
                        },{
						    "id": "s3",
						    "url": "http://3.base.maps.cit.api.here.com/maptile/2.1/maptile/newest/normal.day/{LOD}/{X}/{Y}/256/png8?app_id=DemoAppId01082013GAL&app_code=AJKnXv84fjrb0KIHawS0Tg"
                        }]
                    },
				    {
					    "name": "ESRI_WORLD",
					    "copyright": "© ESRI World Imagery",
					    "Source": [{
						    "id": "s1",
						    "url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{LOD}/{Y}/{X}"
                        }]
                    },
				    {
					    "name": "STAMEN_TONER",
					    "copyright": "© Stamen Toner",
					    "Source": [{
						    "id": "s1",
						    "url": "http://tile.stamen.com/toner/{LOD}/{X}/{Y}.png"
                        }]
                    },
				    {
					    "name": "GMAP",
					    "copyright": "© Google Maps",
					    "Source": [{
						    "id": "s1",
						    "url": "https://mt.google.com/vt/x={X}&y={Y}&z={LOD}&hl="+sLanguage
                        }]
                    }
                ],
				"MapLayerStacks": [
				    {
				    	"name": "HERE",
				    	"MapLayer": {
					    	"name": "layer1",
					    	"refMapProvider": "HERE",
					    	"opacity": "1",
					    	"colBkgnd": "RGB(255,255,255)"
					    }
                    },
				    {
				    	"name": "Google",
				    	"MapLayer": {
					    	"name": "layer1",
					    	"refMapProvider": "GMAP",
					    	"opacity": "1",
					    	"colBkgnd": "RGB(255,255,255)"
					    }
                    },
				    {
				    	"name": "OpenStreet",
				    	"MapLayer": {
					    	"name": "layer1",
					    	"refMapProvider": "OPENSTREET",
					    	"opacity": "1",
					    	"colBkgnd": "RGB(255,255,255)"
					    }
                    },
				    {
				    	"name": "B/W",
				    	"MapLayer": {
					    	"name": "layer1",
					    	"refMapProvider": "STAMEN_TONER",
					    	"opacity": "1",
					    	"colBkgnd": "RGB(255,255,255)"
					    }
                    },
				    {
				    	"name": "WORLD",
				    	"MapLayer": [{
					    	"name": "layer1",
					    	"refMapProvider": "ESRI_WORLD",
					    	"opacity": "1",
					    	"colBkgnd": "RGB(255,255,255)"
					    }]
                    }
                ]
			};
			oGeoMap.setMapConfiguration(oMapConfig);
			oGeoMap.setRefMapLayerStack("OpenStreet");
	    }

	});

});