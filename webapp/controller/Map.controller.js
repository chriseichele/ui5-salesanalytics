/*global history */
sap.ui.define([
	    "de/tum/in/i17/leonardo/ws1718/salesanalytics/controller/BaseController",
        "sap/ui/model/json/JSONModel"
    ], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("de.tum.in.i17.leonardo.ws1718.salesanalytics.controller.Map", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
		    // initialization of the view
		    
		    // define and set data models
            this.oModel = new JSONModel();
			this.oModel.setData({"pageTitle": this.getResourceBundle().getText("mapViewTitle")});
            this.setModel(this.oModel);

			// remember UI controls as controller variables
			this.oSliderTimeframe = this.getSelect("slTimeframe");
			this.oSelectSalesOrg = this.getSelect("slSalesOrganisation");
			this.oSelectProductGroup = this.getSelect("slProductGroup");
		    
			this.oModel.setProperty("/Filter", { "text" : this.getFormattedSummaryText([]) });
			// add label, that is displayed if dynamic page header is collapsed
			this.addSnappedLabel();
			
			// define busy dialog, that can be activted, if data is loading
			this.oBusyDialog = new sap.m.BusyDialog();
			
		    // define colors for map legend
		    this.oModel.setProperty("/Legend",{"Color":{"Now":{
		                                                "1":"rgba(175, 223, 255, 0.8)",
		                                                "2":"rgba(132, 185, 231, 0.8)",
		                                                "3":"rgba(75, 134, 199, 0.8)",
		                                                "4":"rgba(32, 96, 175, 0.8)"},
		                                            "Predicted":{
		                                                "1":"rgba(200, 245, 140, 0.8)",
		                                                "2":"rgba(150, 225, 110, 0.8)",
		                                                "3":"rgba(100, 200, 80, 0.8)",
		                                                "4":"rgba(50, 180, 50, 0.8)",
		                                                "5":"rgba(0, 150, 20, 0.8)"} } } );
            
			// init time slider
			this.configureTimePicker();
            
            // configure geo map
			this.configureGeoMap();
			
			// handle routing parameters
			this.getRouter().getRoute("map").attachPatternMatched(this._onObjectMatched, this);
		},
		
		onAfterRendering : function() {
		    // rendering is done and data binding from the xml-view is processed
		    
			// configuration of sales data for map
			this.configureMapSalesData();
		    
		    // filter select on language to display only elemnts in current language
			this.oSelectSalesOrg.getBinding("items").filter(
			    new sap.ui.model.Filter("LANGU", sap.ui.model.FilterOperator.EQ, this.sLANGU, sap.ui.model.FilterType.Application));
		    
		    // watch map layer change to set routing parameter
		    let domCurrentMapLayer = document.getElementsByClassName("mapLayerSelectedText")[0];
		    domCurrentMapLayer.addEventListener('DOMSubtreeModified', function(){ 
		        this.updateCurrentRoute();
            }.bind(this));
		    
		    // initialize Filters
		    this.aKeys = [];
		    this.getView().byId("FilterBar").getFilterItems().forEach(function(filter){
		        this.aKeys.push(filter.getLabel());
		    }, this);
			// do first filtering
			this.doFilterMap();
		},

		onExit : function () {
		    // clean up on exit
			if (this._oPopover) {
				this._oPopover.destroy();
			}
			this.oModel = null;
			this.aKeys = [];
		},

		/* =========================================================== */
		/* parse routing parameters                                    */
		/* =========================================================== */
		
		_onObjectMatched: function (oEvent) {
		    // get curren map layer
		    let sMapType = oEvent.getParameter("arguments").mapType;
		    if(sMapType) {
		        let oMapConfig = this.oGeoMap.getMapConfiguration();
		        if(oMapConfig.MapLayerStacks.find(function(layer){return layer.name === sMapType;})){
			        this.oGeoMap.setRefMapLayerStack(sMapType);
		        }
		    }
			
			// parse date for timeline (and make sure it is plausible)
			let iYear = oEvent.getParameter("arguments").year;
		    if(iYear) {
		        
    		    let iMonth = oEvent.getParameter("arguments").month - 1;
    		    if(!iMonth) {
    		        iMonth = 0;
    		    }
		        
		        let iYearMin = this.oSliderTimeframe.getMinDate().getFullYear();
		        let iYearMax = this.oSliderTimeframe.getMaxDate().getFullYear();
		        let iMonthMin = this.oSliderTimeframe.getMinDate().getMonth();
		        let iMonthMax = this.oSliderTimeframe.getMaxDate().getMonth();
		        
		        if(iYear < iYearMin) {
		            iYear = iYearMin;
		            iMonth = 0;
		        } else if(iYear > iYearMax) {
		            iYear = iYearMax;
		            iMonth = 11;
		        }
	            if(iMonth < iMonthMin) {
    		        iMonth = iMonthMin;
    		    } else if(iMonth > iMonthMax) {
    		        iMonth = iMonthMax;
    		    }
    		    
    		    let d = new Date(Date.UTC(iYear, iMonth, 1));
    		    let d0 = new Date(Date.UTC(iYear, 0, 1));
    		    this.oSliderTimeframe.removeAllSelectedDates();
    			this.oSliderTimeframe.addSelectedDate(new sap.ui.unified.DateRange({"startDate":d}));
    			this.oSliderTimeframe.setStartDate(d0);
    			
		        this.oModel.setProperty("/DateStart",d);
		    }
		},

		/* =========================================================== */
		/* handlers from view                                          */
		/* =========================================================== */
		
		onToggleHeader: function () {
			this.getPage().setHeaderExpanded(!this.getPage().getHeaderExpanded());
		},
		
		onToggleFooter : function () {
			this.getPage().setShowFooter(!this.getPage().getShowFooter());
		},
		
		onSelectChange: function() {
			var aCurrentFilterValues = [];

			aCurrentFilterValues.push(this.oSelectSalesOrg.getSelectedItems());
			aCurrentFilterValues.push(this.oSelectProductGroup.getSelectedItems());

			this.readSalesData(true);
			this.doFilterMap();
			this.updateFilterCriterias(this.getFilterCriteria(aCurrentFilterValues));
		},
		
		onTimepicker: function() {
		    this.onMonthChange();
		    this.readSalesData();
		    this.oGeoMap.rerender();
			this.doFilterMap();
			
			this.updateCurrentRoute();
		},
		
		onMonthChange: function() {
		    let oDateRange = this.oSliderTimeframe.getSelectedDates().pop();
		    let d = oDateRange.getStartDate();
		    this.oModel.setProperty("/DateStart",d);
		},

		/* =========================================================== */
		/* help function                                               */
		/* =========================================================== */
		
		readSalesData: function(doReread) {
		    if(doReread) {
		        // clear data model and reread all
		        this.oSalesModelLocal.oData = {};
		    }
		    
		    // define filter objects based on filter controls from view to filter the selected data
		    let aFilter = [ new sap.ui.model.Filter("YEAR", sap.ui.model.FilterOperator.EQ, this.oModel.getProperty("/DateStart").getFullYear()),
                           new sap.ui.model.Filter("MONTH", sap.ui.model.FilterOperator.EQ, this.oModel.getProperty("/DateStart").getMonth() + 1) ];
		    this.oSelectProductGroup.getSelectedItems().forEach(function(el){
		        if(el.getKey()){         
		            let oFilter =  new sap.ui.model.Filter('PRODUCT_GROUP', sap.ui.model.FilterOperator.EQ, el.getKey());          
		            aFilter.push(oFilter);
		        }
		    });
		    
		    // reread sales data and process in callback
            let mParams = {
                success: this.transformSalesModel.bind(this),
                urlParameters: { '$select': 'YEAR,MONTH,SALES_ORGANISATION,PRODUCT_GROUP,SHAPE,REVENUE,CURRENCY' },
                filters: aFilter
              };
            this.oSalesModel.read("/SalesMonthProductGroup", mParams );  
            
            // reread predicted sales data (starting from 2012, because there are no sample data any more)
            let d = this.oModel.getProperty("/DateStart");
            let iYearStartPrediction = 2012; //new Date().getFullYear();
            let iMonthStartPrediction = 0;//new Date().getMonth();
            if(d.getFullYear() > iYearStartPrediction 
              || ( d.getFullYear() === iYearStartPrediction 
                && d >= iMonthStartPrediction )) {
                this.readSalesDataPredicted(doReread);
            }
		},
		
		readSalesDataPredicted: function(doReread) {
		    if(doReread) {
		        // clear data model and reread all
		        this.oSalesModelPredict.oData = {};
		    }
		    
		    let iYear = this.oModel.getProperty("/DateStart").getFullYear();
		    let iMonth = this.oModel.getProperty("/DateStart").getMonth() + 1;
		    
		    if(!this.getView().getParent().getParent().getBusy()) {
                this.oBusyDialog.open();
		    }
		    
		    let finished = function() {
		        this.oBusyDialog.close();
		    }.bind(this);
		    
		    // handler for sales org data
		    let processResponseSalesOrg = function(oDataSalesOrg) {
		        
		        let salesOrgs = oDataSalesOrg.results;
                for(let k in salesOrgs) {
                    if (typeof salesOrgs[k] !== 'function') {
                            
                        let sPath = "/SalesMonth";
                        if(!this.oSalesModelPredict.getProperty(sPath)) {
                            this.oSalesModelPredict.setProperty(sPath,{});
                        }
                        sPath = sPath + "/" + salesOrgs[k].SALES_ORGANISATION + "_" + iYear + "_" + iMonth;
                        let oSalesOrg = this.oSalesModelPredict.getProperty(sPath);
                        if(!oSalesOrg) {
                            oSalesOrg = { "YEAR":iYear,
                                          "MONTH":iMonth,
                                          "SALES_ORGANISATION":salesOrgs[k].SALES_ORGANISATION,
                                          "REVENUE":0,
                                          "CURRENCY":salesOrgs[k].CURRENCY,
                                          "tooltip": salesOrgs[k].SALES_ORGANISATION,
                                          "ProductGroups":{} };
                            this.oSalesModelPredict.setProperty(sPath,oSalesOrg);
                            
                            /* read text */
                            this.getSalesOrgText(salesOrgs[k].SALES_ORGANISATION, function(s){oSalesOrg.tooltip = s;});
                            
                            oSalesOrg.position = this.parseGeoShape(salesOrgs[k].SHAPE);
                        }
                    }
                }
		        
		        let aFilter = [];
    		    this.oSelectProductGroup.getSelectedItems().forEach(function(el){
    		        if(el.getKey()){         
    		            let oFilter =  new sap.ui.model.Filter('PRODUCT_GROUP', sap.ui.model.FilterOperator.EQ, el.getKey());          
    		            aFilter.push(oFilter);
    		        }
    		    });
		    
		        // handler for product group data
    		    let processResponseProdGroup = function(oDataProdGroups) {
    		        let prodGroups = oDataProdGroups.results;
    		        // loop over sales orgs
                    for(let k in salesOrgs) {
                        if (typeof salesOrgs[k] !== 'function') {
                            
                            let sPathSalesOrg = "/SalesMonth/" + salesOrgs[k].SALES_ORGANISATION + "_" + iYear + "_" + iMonth;
                            let oSalesOrg = this.oSalesModelPredict.getProperty(sPathSalesOrg);
                        
                            //loop over prod groups
                            for(let p in prodGroups) {
                                if (typeof prodGroups[p] !== 'function') {
                                    // get predicted revenue
                                    let sPath = sPathSalesOrg + "/ProductGroups/" + prodGroups[p].PRODUCT_GROUP;
                                    let oProductGroup = this.oSalesModelPredict.getProperty(sPath);
                                    if(!oProductGroup) {
                                        
                                        // asynchronus ajax call
                                        jQuery.ajax( {
                                             type:'GET',
                                             url:'model/predict.xsjs' + '?year=' + iYear 
                                                                      + '&month=' + iMonth
                                                                      + '&sales_org=' + salesOrgs[k].SALES_ORGANISATION 
                                                                      + '&product_group=' + prodGroups[p].PRODUCT_GROUP
                                                                      + '&market_growth=' + 0,
                                             success:function(data) {
                                                // save returned predicted value on different aggregation levels for charts
                                                let iRevenuePredicted = parseFloat(data);
                                                
                                                if(!iRevenuePredicted || isNaN(iRevenuePredicted) ) {
                                                    iRevenuePredicted = 0;
                                                }
                                                
                                                oProductGroup = { "PRODUCT_GROUP":prodGroups[p].PRODUCT_GROUP,
                                                                  "REVENUE":iRevenuePredicted,
                                                                  "CURRENCY":oSalesOrg.CURRENCY };
                                                // set property in model to save data for data binding
                                                this.oSalesModelPredict.setProperty(sPath,oProductGroup);
                                                // sum for sales org
                                                oSalesOrg.REVENUE = parseFloat(oSalesOrg.REVENUE) + parseFloat(iRevenuePredicted);
                                                
                                             }.bind(this)
                                        });
                                        
                                    }
                                }
                            }
                        }
                    }
                
    		        
                    finished();
    		    }.bind(this);
    		    // read all product groups
                this.oSalesModel.read("/ProductGroups", {
                    success: processResponseProdGroup,
                    error: finished,
                    filters: aFilter
                  } ); 
		        
		    }.bind(this);
		    // read all sales orgs
            this.oSalesModel.read("/SalesMonthProductGroup", {
                success: processResponseSalesOrg,
                error: finished,
                urlParameters: { '$select': 'SALES_ORGANISATION,SHAPE,CURRENCY' }
              } );  
		},
		
		transformSalesModel: function(oData) {
		    // proccess sales data
		    // build deep model and set product groups in array for each salesorg
                
            let iRevenueMin = this.oModel.getProperty("/Legend/Revenue/Min");
            let iRevenueMax = this.oModel.getProperty("/Legend/Revenue/Max");
            let iRevenueSteps = (iRevenueMax - iRevenueMin) / 4;
            this.oModel.setProperty("/Legend/Revenue/1",iRevenueSteps * 1);
            this.oModel.setProperty("/Legend/Revenue/2",iRevenueSteps * 2);
            this.oModel.setProperty("/Legend/Revenue/3",iRevenueSteps * 3);
            this.oModel.setProperty("/Legend/Revenue/4",iRevenueSteps * 4);
            
            let items = oData.results;
            for(let k in items) {
                if (typeof items[k] !== 'function') {
                    if (items[k].__metadata.uri.includes("SalesMonthProductGroup")) {
                        
                        // set aggregated items on month base
                        
                        let sPath = "/SalesMonth";
                        if(!this.oSalesModelLocal.getProperty(sPath)) {
                            this.oSalesModelLocal.setProperty(sPath,{});
                        }
                        sPath = sPath + "/" + items[k].SALES_ORGANISATION + "_" + items[k].YEAR + "_" + items[k].MONTH;
                        let oSalesOrg = this.oSalesModelLocal.getProperty(sPath);
                        if(!oSalesOrg) {
                            oSalesOrg = { "YEAR":items[k].YEAR,
                                          "MONTH":items[k].MONTH,
                                          "SALES_ORGANISATION":items[k].SALES_ORGANISATION,
                                          "REVENUE":0,
                                          "CURRENCY":items[k].CURRENCY,
                                          "tooltip": items[k].SALES_ORGANISATION,
                                          "ProductGroups":{} };
                            this.oSalesModelLocal.setProperty(sPath,oSalesOrg);
                            
                            // read text
                            this.getSalesOrgText(items[k].SALES_ORGANISATION, function(s){oSalesOrg.tooltip = s;});
                            
                            // create geo shape to display in map
                            oSalesOrg.position = this.parseGeoShape(items[k].SHAPE);
                        }
                        
                        sPath = sPath + "/ProductGroups/" + items[k].PRODUCT_GROUP;
                        let oProductGroup = this.oSalesModelLocal.getProperty(sPath);
                        if(!oProductGroup) {
                            oProductGroup = { "PRODUCT_GROUP":items[k].PRODUCT_GROUP,
                                              "REVENUE":items[k].REVENUE,
                                              "CURRENCY":items[k].CURRENCY };
                            this.oSalesModelLocal.setProperty(sPath,oProductGroup);
                            
                            oSalesOrg.REVENUE = parseFloat(oSalesOrg.REVENUE) + parseFloat(items[k].REVENUE);
                            
                        }
                        
                    }
                }
            }
        },
            
        parseGeoShape: function(sShape) {
            // build latitude and longitude string out of geojson
            let mapPositionString;
            if(sShape){
                let shapeFeatures = JSON.parse(sShape);
                mapPositionString = "";
                if(shapeFeatures) {
                    shapeFeatures.coordinates.pop().forEach(function(coor){
                        let x = coor.pop();
                        let y = coor.pop();
                        mapPositionString = mapPositionString + y + ";" + x + ";0;";
                    });
                    mapPositionString = mapPositionString.substring(0, mapPositionString.length - 1);
                }
            }
            return mapPositionString;
        },

		doFilterMap: function () {
		    // apply current selected filter to the map
		    let aFilter = [];
		    this.oSelectSalesOrg.getSelectedItems().forEach(function(el){
		        if(el.getKey()){
		            aFilter.push(new sap.ui.model.Filter("SALES_ORGANISATION", sap.ui.model.FilterOperator.Contains, el.getKey()));
		        }
		    });
		    this.oSelectProductGroup.getSelectedItems().forEach(function(el){
		        if(el.getKey()){         
		            let oFilter =  new sap.ui.model.Filter({ path: 'ProductGroups', test: function(oGroups) { return !!oGroups[el.getKey()]; } });          
		            aFilter.push(oFilter);
		        }
		    });
		    
		    aFilter.push(new sap.ui.model.Filter("YEAR", sap.ui.model.FilterOperator.EQ, this.oModel.getProperty("/DateStart").getFullYear()));
		    aFilter.push(new sap.ui.model.Filter("MONTH", sap.ui.model.FilterOperator.EQ, this.oModel.getProperty("/DateStart").getMonth() + 1));
		    
		    let oMapAreaItemsNow = this.getView().byId("mapAreasNow").getBinding("items");
		    if(oMapAreaItemsNow) {
		        oMapAreaItemsNow.filter(aFilter, sap.ui.model.FilterType.Application);
		    }
		    let oMapAreaItemsPredict = this.getView().byId("mapAreasPredict").getBinding("items");
		    if(oMapAreaItemsPredict) {
		        oMapAreaItemsPredict.filter(aFilter, sap.ui.model.FilterType.Application);
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

		/* =========================================================== */
		/* handlers for map events                                     */
		/* =========================================================== */

		onPressLegend: function() {
			if (this.byId("vbi").getLegendVisible() === true) {
				this.byId("vbi").setLegendVisible(false);
				this.byId("btnLegend").setTooltip(this.getResourceBundle().getText("legendShow"));
			} else {
				this.byId("vbi").setLegendVisible(true);
				this.byId("btnLegend").setTooltip(this.getResourceBundle().getText("legendHide"));
			}
		},

		onPressResize: function() {
			if (this.byId("btnResize").getTooltip() === "Minimize") {
				if (sap.ui.Device.system.phone) {
					this.byId("vbi").minimize(132, 56, 1320, 560); //Height: 3,5 rem; Width: 8,25 rem
				} else {
					this.byId("vbi").minimize(168, 72, 1680, 720); //Height: 4,5 rem; Width: 10,5 rem
				}
				this.byId("btnResize").setTooltip(this.getResourceBundle().getText("maximize"));
			} else {
				this.byId("vbi").maximize();
				this.byId("btnResize").setTooltip(this.getResourceBundle().getText("minimize"));
			}
		},

		onClickCircle: function(oEvent) {
		    // handle click on data-element on map
		    // opens popover with additional information and jump options 
			
			var oClickedElement = oEvent.getSource();  
			
			// create popover
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("de.tum.in.i17.leonardo.ws1718.salesanalytics.view.MapCirclePopover", this);
				this.getView().addDependent(this._oPopover);
			}
			if (this._oPopover) {
				if(oClickedElement.oBindingContexts.sales2){
				    this.oModel.setProperty("/MapPopoverDisplayPredictedValues",false);
				    this._oPopover.bindElement("sales2>" + oClickedElement.oBindingContexts.sales2.sPath);
				}
				if(oClickedElement.oBindingContexts.sales3){
				    this.oModel.setProperty("/MapPopoverDisplayPredictedValues",true);
				    this._oPopover.bindElement("sales3>" + oClickedElement.oBindingContexts.sales3.sPath);
				}
			}

			// delay because addDependent will do a async rerendering and the actionSheet will immediately close without it.
			jQuery.sap.delayedCall(0, this, function () {
    			if(!oClickedElement.bOutput){
    			    // clicked element is not available in DOM => generate spot to open popover from there
    			    // always the case for geoshapes, because they are only renderen on the canvas
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

		/* =========================================================== */
		/* navigation                                                  */
		/* =========================================================== */
		
		updateCurrentRoute: function() {
			this.getRouter().navTo("map", { 
				mapType : this.oGeoMap.getRefMapLayerStack(),
				year : this.oModel.getProperty("/DateStart").getFullYear(),
				month : this.oModel.getProperty("/DateStart").getMonth() + 1
			}, true);
		},

		gotoPredict: function(oEvent) {
		    // go to predict route and pass routing parameters
		    let iYear = this.oModel.getProperty("/DateStart").getFullYear();
		    let iMonth = this.oModel.getProperty("/DateStart").getMonth() + 1;
		    let sSalesOrgNow = oEvent.getSource().data("salesorgNow");
		    let sSalesOrgPredict = oEvent.getSource().data("salesorgPredict");
		    let sSalesOrg, oSalesOrg;
		    if(sSalesOrgNow) {
		        sSalesOrg = sSalesOrgNow;
		        oSalesOrg = this.oSalesModelLocal.getProperty("/SalesMonth/" + sSalesOrg + "_" + iYear + "_" + iMonth);
		    } else {
		        sSalesOrg = sSalesOrgPredict;
		        oSalesOrg = this.oSalesModelPredict.getProperty("/SalesMonth/" + sSalesOrg + "_" + iYear + "_" + iMonth);
		    }
		    
		    let sProductGroups = "";
		    Object.keys(oSalesOrg.ProductGroups).forEach(function(key) {
		        sProductGroups = sProductGroups + key + "_" + sSalesOrg + ",";
            });
            sProductGroups = sProductGroups.slice(0, -1);
            
			this.getRouter().navTo("predict");
			this.getRouter().navTo("predict", { 
				productGroups : sProductGroups,
				yearStart1: iYear,
				monthStart1: 1,
				yearEnd1: iYear,
				monthEnd1: 12,
				yearStart2: iYear + 1,
				monthStart2: 1,
				yearEnd2: iYear + 1,
				monthEnd2: 12,
				expectedMarketGrowth: 0
			}, true);
		},

		/* =========================================================== */
		/* initial configuration help functions                        */
		/* =========================================================== */
		
		configureTimePicker: function() {
		    // limit available date range for the timepicker
		    
		    //TODO: could be changed to dynamic values
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
			
			// execute like it was clicked on the first load
			this.onMonthChange();
		},

        configureGeoMap: function() {
			var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();

			// geo map configuration
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
		
		configureMapSalesData: function() {
            // get sales data from odata model (sales cube)
            this.oSalesModel = this.getModel("sales");
            this.oModel.setProperty("/Legend/Revenue",{"Min":undefined,"Max":undefined});
            this.oSalesModel.read("/SalesMonthProductGroup", 
                                    { 
                                        urlParameters: { 
                                            '$select': 'YEAR,MONTH,SALES_ORGANISATION,REVENUE', 
                                            '$orderby': 'REVENUE asc', 
                                            '$top': '1' 
                                        },
                                        success: function(oData){ let iRevenueMin = oData.results.pop().REVENUE;
                                        this.oModel.setProperty("/Legend/Revenue/Min",iRevenueMin); }.bind(this)
                                    }
                                  );
            this.oSalesModel.read("/SalesMonthProductGroup", 
                                    { 
                                        urlParameters: { 
                                            '$select': 'YEAR,MONTH,SALES_ORGANISATION,REVENUE', 
                                            '$orderby': 'REVENUE desc', 
                                            '$top': '1' 
                                        },
                                        success: function(oData){ let iRevenueMax = oData.results.pop().REVENUE;
                                        this.oModel.setProperty("/Legend/Revenue/Max",iRevenueMax); }.bind(this)
                                    }
                                  );
            this.oSalesModelLocal = new JSONModel();
            this.setModel(this.oSalesModelLocal,"sales2");
            this.oSalesModelPredict = new JSONModel();
            this.setModel(this.oSalesModelPredict,"sales3");
            this.readSalesData();  
		}

	});

});