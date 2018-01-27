/*global history */
sap.ui.define([
	    "de/tum/in/i17/leonardo/ws1718/salesanalytics/controller/BaseController",
        "sap/ui/vbm/AnalyticMap",
        "sap/ui/model/json/JSONModel"
    ], function(BaseController, AnalyticMap, JSONModel) {
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
		    
			this.oModel.setProperty("/Filter", { "text" : this.getFormattedSummaryText([]) });
			this.addSnappedLabel();
			
		    this.oModel.setProperty("/ColorLegend",{"Now":{
		                                                "1":"rgba(175, 223, 255, 0.8)",
		                                                "2":"rgba(132, 185, 231, 0.8)",
		                                                "3":"rgba(75, 134, 199, 0.8)",
		                                                "4":"rgba(32, 96, 175, 0.8)"},
		                                            "Predicted":{
		                                                "1":"rgba(255, 255, 200, 0.8)",
		                                                "2":"rgba(255, 219, 124, 0.8)",
		                                                "3":"rgba(255, 192, 62, 0.8)",
		                                                "4":"rgba(255, 165, 0, 0.8)"} } );
            
			/* init time slider */
			this.configureTimePicker();
            
            /* configure geo map */
			this.configureGeoMap();
			
			this.getRouter().getRoute("map").attachPatternMatched(this._onObjectMatched, this);
		},
		
		onAfterRendering : function() {
		    
		    /* watch map layer change */
		    let domCurrentMapLayer = document.getElementsByClassName("mapLayerSelectedText")[0];
		    let me = this;
		    domCurrentMapLayer.addEventListener('DOMSubtreeModified', function(){ 
		        me.updateCurrentRoute();
            });
		    
            /* get sales data */
            this.oSalesModel = this.getModel("sales");
            
            let iRevenueMin;
            this.oSalesModel.read("/SalesCube", 
                                    { 
                                        urlParameters: { 
                                            '$select': 'YEAR,MONTH,SALES_ORGANISATION,SHAPE,REVENUE,SALES_QUANTITY', 
                                            '$orderby': 'REVENUE asc', 
                                            '$top': '1' 
                                        },
                                        success: function(oData){ iRevenueMin = oData.results.pop().REVENUE; }
                                    }
                                  );
            let iRevenueMax;
            this.oSalesModel.read("/SalesCube", 
                                    { 
                                        urlParameters: { 
                                            '$select': 'YEAR,MONTH,SALES_ORGANISATION,SHAPE,REVENUE,SALES_QUANTITY', 
                                            '$orderby': 'REVENUE desc', 
                                            '$top': '1' 
                                        },
                                        success: function(oData){ iRevenueMax = oData.results.pop().REVENUE; }
                                    }
                                  );

            this.oSalesModel.attachRequestCompleted(function(){
                //TODO
                //if(!this.oSalesModel.aBindings[2].bPendingRequest) {
                    let items = this.oSalesModel.getProperty("/");
                    for(let k in items) {
                        if (typeof items[k] !== 'function') {
                            items[k].position = "";
                            if(items[k].SHAPE){
                                let shapeFeatures = JSON.parse(items[k].SHAPE);
                                if(shapeFeatures) {
                                    shapeFeatures.coordinates.pop().forEach(function(coor){
                                        let x = coor.pop();
                                        let y = coor.pop();
                                        items[k].position = items[k].position + y + ";" + x + ";0;";
                                    });
                                    items[k].position = items[k].position.substring(0, items[k].position.length - 1);
                                }
                            }
                            
                            items[k].tooltip = "test";//TODO set sales area name
                            let iRevenueSteps = (iRevenueMax - iRevenueMin) / 4;
                            let iRevenueCurrentAboveMin = items[k].REVENUE - iRevenueMin;
                            let sColorContent;
                            switch (true) {
                              case (iRevenueCurrentAboveMin < iRevenueSteps * 1):
                                sColorContent = this.oModel.getProperty("/ColorLegend/Now/1");
                                 break;
                              case (iRevenueCurrentAboveMin < iRevenueSteps * 2):
                                sColorContent = this.oModel.getProperty("/ColorLegend/Now/2");
                                 break;
                              case (iRevenueCurrentAboveMin < iRevenueSteps * 3):
                                sColorContent = this.oModel.getProperty("/ColorLegend/Now/3");
                                 break;
                              default:
                                sColorContent = this.oModel.getProperty("/ColorLegend/Now/4");
                            }
                            items[k].colors = {"content":sColorContent,"border":"rgba(180,180,180,0.9)","hover":"RHLSA(0;1.1;1.0;1.0)"};
                        }
                    }
                //}
            },this);
		    
		    /* initialize Filters */
		    this.aKeys = [];
		    this.getView().byId("FilterBar").getFilterItems().forEach(function(filter){
		        this.aKeys.push(filter.getLabel());
		    }, this);
			/* do first filtering */
			this.doFilterMap();
		},

		onExit : function () {
			if (this._oPopover) {
				this._oPopover.destroy();
			}
			
			this.oModel = null;
			this.aKeys = [];
		},
		
		_onObjectMatched: function (oEvent) {
		    let sMapType = oEvent.getParameter("arguments").mapType;
		    if(sMapType) {
		        let oMapConfig = this.oGeoMap.getMapConfiguration();
		        if(oMapConfig.MapLayerStacks.find(function(layer){return layer.name === sMapType;})){
			        this.oGeoMap.setRefMapLayerStack(sMapType);
		        }
		    }
			
			let iYear = oEvent.getParameter("arguments").year;
		    if(iYear) {
		        
    		    let iMonth = oEvent.getParameter("arguments").month;
    		    if(!iMonth) {
    		        iMonth = 1;
    		    }
		        
		        let iYearMin = this.oSliderTimeframe.getMinDate().getFullYear();
		        let iYearMax = this.oSliderTimeframe.getMaxDate().getFullYear();
		        let iMonthMin = this.oSliderTimeframe.getMinDate().getMonth() + 1;
		        let iMonthMax = this.oSliderTimeframe.getMaxDate().getMonth() + 1;
		        
		        if(iYear < iYearMin) {
		            iYear = iYearMin;
		            iMonth = 1;
		        } else if(iYear > iYearMax) {
		            iYear = iYearMax;
		            iMonth = 12;
		        }
	            if(iMonth < iMonthMin) {
    		        iMonth = iMonthMin;
    		    } else if(iMonth > iMonthMax) {
    		        iMonth = iMonthMax;
    		    }
    		    
    		    let d = new Date(Date.UTC(iYear, iMonth - 1, 1));
    		    let d0 = new Date(Date.UTC(iYear, 0, 1));
    		    this.oSliderTimeframe.removeAllSelectedDates();
    			this.oSliderTimeframe.addSelectedDate(new sap.ui.unified.DateRange({"startDate":d}));
    			this.oSliderTimeframe.setStartDate(d0);
		    }
		},
		
		onToggleHeader: function () {
			this.getPage().setHeaderExpanded(!this.getPage().getHeaderExpanded());
		},
		
		onToggleFooter : function () {
			this.getPage().setShowFooter(!this.getPage().getShowFooter());
		},
		
		onSelectChange: function() {
			var aCurrentFilterValues = [];

			aCurrentFilterValues.push(this.oSelectSalesOrg.getSelectedItems());
			aCurrentFilterValues.push(this.oSelectProductCategory.getSelectedItems());
			aCurrentFilterValues.push(this.oSelectProductGroup.getSelectedItems());

			this.doFilterMap();
			this.updateFilterCriterias(this.getFilterCriteria(aCurrentFilterValues));
		},
		
		onTimepicker: function() {
		    this.onMonthChange();
		    this.oGeoMap.rerender();
			this.doFilterMap();
			
			this.updateCurrentRoute();
		},
		
		onMonthChange: function() {
		    let oDateRange = this.oSliderTimeframe.getSelectedDates().pop();
		    let d = oDateRange.getStartDate();
		    this.oModel.setProperty("/DateStart",d);
		    //this.oModel.setProperty("/DateEnd",oDateRange.getEndDate());
			//sap.m.MessageToast.show(oDateRange.getStartDate() + " - " + oDateRange.getEndDate());
		},

		doFilterMap: function () {
		    let aFilter = [];
		    this.oSelectSalesOrg.getSelectedItems().forEach(function(el){
		        if(el.getKey()){
		            aFilter.push(new sap.ui.model.Filter("SALES_ORGANISATION", sap.ui.model.FilterOperator.Contains, el.getKey()));
		        }
		    });
		    
		    aFilter.push(new sap.ui.model.Filter("YEAR", sap.ui.model.FilterOperator.EQ, this.oModel.getProperty("/DateStart").getFullYear()));
		    aFilter.push(new sap.ui.model.Filter("MONTH", sap.ui.model.FilterOperator.EQ, this.oModel.getProperty("/DateStart").getMonth()+1));
		    
		    let oMapAreaItems = this.getView().byId("mapAreasNow").getBinding("items");
		    if(oMapAreaItems) {
		        oMapAreaItems.filter(aFilter, sap.ui.model.FilterType.Application);
		    }
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
			let aFilters = [];

			aFilters = this.aKeys.map(function (sCriteria, i) {
				return new sap.ui.model.Filter(sCriteria, sap.ui.model.FilterOperator.Contains, aCurrentFilterValues[i]);
			});

			return aFilters;
		},
		getFilterCriteria : function (aCurrentFilterValues){
			return this.aKeys.filter(function (el, i) {
				if (aCurrentFilterValues[i] !== "" && aCurrentFilterValues[i].length > 0) { 
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
				if(oClickedElement.oBindingContexts.sales){
				    this._oPopover.bindElement("sales>" + oClickedElement.oBindingContexts.sales.sPath);
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
		
		/* HELP FUNCTIONS */
		
		configureTimePicker: function() {
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
			
			let oSelectedDateStart = this.oSliderTimeframe.getStartDate();
		    this.oSliderTimeframe.removeAllSelectedDates();
			this.oSliderTimeframe.addSelectedDate(new sap.ui.unified.DateRange({"startDate":oSelectedDateStart}));
			/*
			let oSelectedDateEnd = new Date(oSelectedDateStart);
			oSelectedDateEnd.setDate(oSelectedDateStart.getDate() + 364);
			this.oSliderTimeframe.addSelectedDate(new sap.ui.unified.DateRange({"startDate":oSelectedDateStart,"endDate":oSelectedDateEnd}));
			*/
			
			this.onMonthChange();
		},

        configureGeoMap: function() {
			var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();

			/* geo map configuration */
			this.oGeoMap = this.getView().byId("map2");
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
						    "url": "https://mt.google.com/vt/x={X}&y={Y}&z={LOD}&hl=" + sLanguage
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
				    	"name": "BlackWhite",
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
			this.oGeoMap.setMapConfiguration(oMapConfig);
			this.oGeoMap.setRefMapLayerStack("OpenStreet");
	    },
		
		updateCurrentRoute: function() {
			this.getRouter().navTo("map", { 
				mapType : this.oGeoMap.getRefMapLayerStack(),
				year : this.oModel.getProperty("/DateStart").getFullYear(),
				month : this.oModel.getProperty("/DateStart").getMonth() + 1
			}, true);
		}

	});

});