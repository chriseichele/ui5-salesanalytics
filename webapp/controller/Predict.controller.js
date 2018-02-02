/*global history */
sap.ui.define([
	"de/tum/in/i17/leonardo/ws1718/salesanalytics/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("de.tum.in.i17.leonardo.ws1718.salesanalytics.controller.Predict", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
            this.oModel = new JSONModel();
			this.oModel.setData({"pageTitle": this.getResourceBundle().getText("predictViewTitle")});
			this.oModel.setProperty("/ProductGroupList",{});
            this.setModel(this.oModel);
            
            this.oSalesModelLocal = new JSONModel();
            this.setModel(this.oSalesModelLocal,"sales2");
            
		    this.oIconTabBarCharts = this.getView().byId("IconTabBarChartTypes");
		    this.oSplitView = this.getView().byId("SplitView");
		    this.oVizFrame = this.getView().byId("VizFrame");
            
			this.getView().byId("detail").attachNavButtonPress(this._onNavBack, this);
			this.getRouter().getRoute("predict").attachPatternMatched(this._onObjectMatched, this);
			
			let me = this;
			this.oIconTabBarCharts.attachEvent('select', function attachTabSelect(oEvent) {
				me._onTabSelect(oEvent, this);
			});
			
			this.oBusyDialog = new sap.m.BusyDialog();
		    
		},

		onExit : function () {
			if (this._oAddNewListItemDialog) {
				this._oAddNewListItemDialog.destroy();
			}
			this.oModel = null;
		},
		
		_onNavBack: function() {
		    this.oSplitView.backMaster();
        },
		
		_onObjectMatched: function (oEvent) {
		    this.oRouteArguments = oEvent.getParameter("arguments");
		    let sKey = this.oRouteArguments.chartType;
		    this.oIconTabBarCharts.setSelectedKey(sKey);
            this.oVizFrame.setVizType(this.oIconTabBarCharts.getSelectedKey());
            
            let iYearStart1 = parseInt(this.oRouteArguments.yearStart1, 10);
            let iMonthStart1 = parseInt(this.oRouteArguments.monthStart1, 10) - 1;
            let iYearEnd1 = parseInt(this.oRouteArguments.yearEnd1, 10);
            let iMonthEnd1 = parseInt(this.oRouteArguments.monthEnd1, 10) - 1;
            let iYearStart2 = parseInt(this.oRouteArguments.yearStart2, 10);
            let iMonthStart2 = parseInt(this.oRouteArguments.monthStart2, 10) - 1;
            let iYearEnd2 = parseInt(this.oRouteArguments.yearEnd2, 10);
            let iMonthEnd2 = parseInt(this.oRouteArguments.monthEnd2, 10) - 1;
            if(iYearStart1) {
                this.oModel.setProperty("/dateStart1",new Date(Date.UTC(iYearStart1, iMonthStart1, 1)));
            }
            if(iYearStart2) {
                this.oModel.setProperty("/dateStart2",new Date(Date.UTC(iYearStart2, iMonthStart2, 1)));
            }
            if(iYearEnd1) {
                this.oModel.setProperty("/dateEnd1",new Date(Date.UTC(iYearEnd1, iMonthEnd1, 1)));
            }
            if(iYearEnd2) {
                this.oModel.setProperty("/dateEnd2",new Date(Date.UTC(iYearEnd2, iMonthEnd2, 1)));
            }
            
            let sProductGroups = this.oRouteArguments.productGroups;
            if (sProductGroups) {
                let aProductGroups = sProductGroups.split(",");
			    this.oModel.setProperty("/ProductGroupList",{});
                aProductGroups.forEach(function(sProdGroupSalesOrg) {
                    let aKeys = sProdGroupSalesOrg.split("_");
                    let sProdGroup = aKeys[0];
                    let sSalesOrg = aKeys[1];
                    this.oModel.setProperty("/ProductGroupList/" + sProdGroupSalesOrg,{
                        key: sProdGroup,
                        salesOrg: sSalesOrg
                    });
                }, this);
            }
		    
		    /* after route is processed: configure chart data to be displayed */
            if(!this.getView().getParent().getParent().getBusy()) {
                this.oBusyDialog.open();
		    }
		    this.configureChart();
		},
		
		_onTabSelect: function (oEvent) {
		    this.getRouter().stop();
		    this.oRouteArguments.chartType = oEvent.getParameter("key");
			if(oEvent.getParameter("key")) {
				this.getRouter().navTo("predict", this.oRouteArguments, true);
			}
		    this.configureChart(false);
		    window.setTimeout(function(){this.getRouter().initialize(true);}.bind(this), 1);
		    //this.getRouter().initialize();
		},
		
		onDate1Select: function(oEvent) {
		    if(oEvent.getParameter("from")) {
		        this.oRouteArguments.yearStart1 = oEvent.getParameter("from").getFullYear();
		        this.oRouteArguments.monthStart1 = oEvent.getParameter("from").getMonth() + 1;
		    }
		    if(oEvent.getParameter("to")) {
		        this.oRouteArguments.yearEnd1 = oEvent.getParameter("to").getFullYear();
		        this.oRouteArguments.monthEnd1 = oEvent.getParameter("to").getMonth() + 1;
		    }
			this.getRouter().navTo("predict", this.oRouteArguments, true);
		},
		
		onDate2Select: function(oEvent) {
		    if(oEvent.getParameter("from")) {
		        this.oRouteArguments.yearStart2 = oEvent.getParameter("from").getFullYear();
		        this.oRouteArguments.monthStart2 = oEvent.getParameter("from").getMonth() + 1;
		    }
		    if(oEvent.getParameter("to")) {
		        this.oRouteArguments.yearEnd2 = oEvent.getParameter("to").getFullYear();
		        this.oRouteArguments.monthEnd2 = oEvent.getParameter("to").getMonth() + 1;
		    }
			this.getRouter().navTo("predict", this.oRouteArguments, true);
		},
		
		rereadSalesData: function(callback) {
		    
            this.oSalesModel = this.getModel("sales");
		    this.oSalesModelLocal.oData = {};
            
		    let aFilter = [];
		    
		    let ds1 = this.oModel.getProperty("/dateStart1");
		    let de1 = this.oModel.getProperty("/dateEnd1");
		    let oFilterYears;
		    if(ds1 && de1) {
    		    let iYearStart1 = ds1.getFullYear();
    		    let iMonthStart1 = ds1.getMonth() + 1;
    		    let iYearEnd1 = de1.getFullYear();
    		    let iMonthEnd1 = de1.getMonth() + 1;
		    
    		    oFilterYears = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter({
                                    filters: [
                                        new sap.ui.model.Filter("YEAR", sap.ui.model.FilterOperator.EQ, iYearStart1),
                                        new sap.ui.model.Filter("MONTH", sap.ui.model.FilterOperator.GE, iMonthStart1)
                                    ],
                                    and: true
                                }),
                                new sap.ui.model.Filter("YEAR", sap.ui.model.FilterOperator.GT, iYearStart1)
                            ],
                            and: false
                        }),
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter({
                                    filters: [
                                        new sap.ui.model.Filter("YEAR", sap.ui.model.FilterOperator.EQ, iYearEnd1),
                                        new sap.ui.model.Filter("MONTH", sap.ui.model.FilterOperator.LE, iMonthEnd1)
                                    ],
                                    and: true
                                }),
                                new sap.ui.model.Filter("YEAR", sap.ui.model.FilterOperator.LT, iYearEnd1)
                            ],
                            and: false
                        })
                    ],
                    and: true
                });
		    }
                           
		    let oGroups = this.oModel.getProperty("/ProductGroupList");
		    let oFilterProdGroups;
		    if(JSON.stringify(oGroups) !== "{}") {
		        let aFilterProdGroups = [];
		        let oGroupList = this.oModel.getProperty("/ProductGroupList");
		        Object.keys(oGroupList).forEach(function(key) {
                    let el = oGroupList[key];
    		        if(el.key && el.salesOrg){         
    		            let oFilter =  new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("SALES_ORGANISATION", sap.ui.model.FilterOperator.EQ, el.salesOrg),
                                new sap.ui.model.Filter("PRODUCT_GROUP", sap.ui.model.FilterOperator.EQ, el.key)
                            ],
                            and: true
                        });
    		            aFilterProdGroups.push(oFilter);
    		        }
                });
                oFilterProdGroups = new sap.ui.model.Filter({filters: aFilterProdGroups, and:false});
		    }
		    
		    if(oFilterYears && oFilterProdGroups) {
		        aFilter.push(new sap.ui.model.Filter({filters:[oFilterYears,oFilterProdGroups],and:true}));
		    } else if(oFilterProdGroups && this.oModel.getProperty("/dateStart2") ) {
		        aFilter.push(oFilterProdGroups);
		    }
		    
		    if(aFilter.length > 0) {
		        let readPredictedData = function() {
                    let sProductGroups = this.oRouteArguments.productGroups;
                    if (sProductGroups) {
                        sProductGroups.split(",").forEach(function(sProdGroupSalesOrg) {
                            let aKeys = sProdGroupSalesOrg.split("_");
                            let sProdGroup = aKeys[0];
                            let sSalesOrg = aKeys[1];
                            /* now we have every product group sales org combination at this loop level */
                            /* iterate over years and months */
                            let ds2 = this.oModel.getProperty("/dateStart2");
                            let de2 = this.oModel.getProperty("/dateEnd2");
                            let iYearStart2 = ds2.getFullYear();
                            let iMonthStart2 = ds2.getMonth() + 1;
                            let iYearEnd2 = de2.getFullYear();
                            let iMonthEnd2 = de2.getMonth() + 1;
                            let iYear = iYearStart2;
                            let iMonth = iMonthStart2;
                            let loadPredictedData = function(y,m,org,group){
                                //TODO use asynchronous method, if service in backend is adjusted
                                let oPredictModel = new JSONModel();
                                oPredictModel.loadData('model/predict.xsjs' + '?year=' + y + '&month=' + m + '&sales_org=' + org + '&product_group=' + group, "", false);
                                let iRevenuePredicted = parseFloat(oPredictModel.getData());
                                let sId, sPath, oEntry;
                                
                                // sales year/month/productgroup
                                sId = y + "_" + m + "_" + org + "_" + group;
                                sPath = "/SalesYearMonthProductGroup/" + sId;
                                oEntry = this.oSalesModelLocal.getProperty(sPath);
                                if(!oEntry) {
                                    oEntry = { "YEAR":y,
                                               "MONTH":m,
                                               "SALES_ORGANISATION":org,
                                               "PRODUCT_GROUP":group,
                                               "date": new Date(Date.UTC(y, m - 1, 1)),
                                               "REVENUE_PREDICTED": iRevenuePredicted,
                                               "CURRENCY":"" };
                                    this.oSalesModelLocal.setProperty(sPath,oEntry);
                                } else {
                                    if(oEntry.REVENUE_PREDICTED) {
                                        oEntry.REVENUE_PREDICTED = oEntry.REVENUE_PREDICTED + iRevenuePredicted;
                                    } else {
                                        oEntry.REVENUE_PREDICTED = iRevenuePredicted;
                                    }
                                }
                                
                                // sales year/month
                                sId = y + "_" + m;
                                sPath = "/SalesYearMonth/" + sId;
                                oEntry = this.oSalesModelLocal.getProperty(sPath);
                                if(!oEntry) {
                                    oEntry = { "YEAR":y,
                                               "MONTH":m,
                                               "date": new Date(Date.UTC(y, m - 1, 1)),
                                               "REVENUE_PREDICTED": iRevenuePredicted,
                                               "CURRENCY":"" };
                                    this.oSalesModelLocal.setProperty(sPath,oEntry);
                                } else {
                                    if(oEntry.REVENUE_PREDICTED) {
                                        oEntry.REVENUE_PREDICTED = oEntry.REVENUE_PREDICTED + iRevenuePredicted;
                                    } else {
                                        oEntry.REVENUE_PREDICTED = iRevenuePredicted;
                                    }
                                }
                                
                                // sales month
                                sId = m;
                                sPath = "/SalesMonth/" + sId;
                                oEntry = this.oSalesModelLocal.getProperty(sPath);
                                if(!oEntry) {
                                    oEntry = { "MONTH":m,
                                               "REVENUE_PREDICTED": iRevenuePredicted,
                                               "CURRENCY":"" };
                                    this.oSalesModelLocal.setProperty(sPath,oEntry);
                                } else {
                                    if(oEntry.REVENUE_PREDICTED) {
                                        oEntry.REVENUE_PREDICTED = oEntry.REVENUE_PREDICTED + iRevenuePredicted;
                                    } else {
                                        oEntry.REVENUE_PREDICTED = iRevenuePredicted;
                                    }
                                }
                                
                                // sales salesorg/prodgroup
                                sId = org + "_" + group;
                                sPath = "/SalesSalesOrgProdGroup/" + sId;
                                oEntry = this.oSalesModelLocal.getProperty(sPath);
                                if(!oEntry) {
                                    oEntry = { "SALES_ORGANISATION":org,
                                               "PRODUCT_GROUP":group,
                                               "REVENUE_PREDICTED": iRevenuePredicted,
                                               "CURRENCY":"" };
                                    this.oSalesModelLocal.setProperty(sPath,oEntry);
                                } else {
                                    if(oEntry.REVENUE_PREDICTED) {
                                        oEntry.REVENUE_PREDICTED = oEntry.REVENUE_PREDICTED + iRevenuePredicted;
                                    } else {
                                        oEntry.REVENUE_PREDICTED = iRevenuePredicted;
                                    }
                                }
                                
                            }.bind(this);
                            while(iYear < iYearEnd2 || (iYear === iYearEnd2 && iMonth <= iMonthEnd2)) {
                                loadPredictedData(JSON.parse(JSON.stringify(iYear)),
                                                  JSON.parse(JSON.stringify(iMonth)),
                                                  JSON.parse(JSON.stringify(sSalesOrg)),
                                                  JSON.parse(JSON.stringify(sProdGroup)));
                                /* increase for next iteration */
                                if(iMonth < 12) {
                                    iMonth++;
                                } else {
                                    iMonth = 1;
                                    iYear++;
                                }
                            }
                            callback(); //TODO: remove callback on this position, if asynchronous service works
                        }, this);
                    }
		        }.bind(this);
    		    let processData = function(oData) {
		            
                    let items = oData.results;
                    for(let k in items) {
                        let el = items[k];
                        if (typeof el !== 'function') {
                            
                            let iRevenue = parseFloat(el.REVENUE);
                            
                            let sId, sPath, oEntry;
                            
                            // sales year/month/productgroup
                            sId = el.YEAR + "_" + el.MONTH + "_" + el.SALES_ORGANISATION + "_" + el.PRODUCT_GROUP; 
                            sPath = "/SalesYearMonthProductGroup/" + sId;
                            oEntry = this.oSalesModelLocal.getProperty(sPath);
                            if(!oEntry) {
                                oEntry = { "YEAR":el.YEAR,
                                           "MONTH":el.MONTH,
                                           "date":el.date,
                                           "SALES_ORGANISATION":el.SALES_ORGANISATION,
                                           "PRODUCT_GROUP":el.PRODUCT_GROUP,
                                           "REVENUE":iRevenue,
                                           "CURRENCY":el.CURRENCY };
                                this.oSalesModelLocal.setProperty(sPath,oEntry);
                            } else {
                                if(oEntry.REVENUE) {
                                    oEntry.REVENUE = oEntry.REVENUE + iRevenue;
                                } else {
                                    oEntry.REVENUE = iRevenue;
                                }
                                oEntry.CURRENCY = el.CURRENCY;
                            }
                            
                            // sales year/month
                            sId = el.YEAR + "_" + el.MONTH
                            sPath = "/SalesYearMonth/" + sId;
                            oEntry = this.oSalesModelLocal.getProperty(sPath);
                            if(!oEntry) {
                                oEntry = { "YEAR":el.YEAR,
                                           "MONTH":el.MONTH,
                                           "date":el.date,
                                           "REVENUE":iRevenue,
                                           "CURRENCY":el.CURRENCY };
                                this.oSalesModelLocal.setProperty(sPath,oEntry);
                            } else {
                                if(oEntry.REVENUE) {
                                    oEntry.REVENUE = oEntry.REVENUE + iRevenue;
                                } else {
                                    oEntry.REVENUE = iRevenue;
                                }
                                oEntry.CURRENCY = el.CURRENCY;
                            }
                            
                            // sales month
                            sId = el.MONTH
                            sPath = "/SalesMonth/" + sId;
                            oEntry = this.oSalesModelLocal.getProperty(sPath);
                            if(!oEntry) {
                                oEntry = { "MONTH":el.MONTH,
                                           "REVENUE":iRevenue,
                                           "CURRENCY":el.CURRENCY };
                                this.oSalesModelLocal.setProperty(sPath,oEntry);
                            } else {
                                if(oEntry.REVENUE) {
                                    oEntry.REVENUE = oEntry.REVENUE + iRevenue;
                                } else {
                                    oEntry.REVENUE = iRevenue;
                                }
                                oEntry.CURRENCY = el.CURRENCY;
                            }
                            
                            // sales salesorg/prodgroup
                            sId = el.SALES_ORGANISATION + "_" + el.PRODUCT_GROUP; 
                            sPath = "/SalesSalesOrgProdGroup/" + sId;
                            oEntry = this.oSalesModelLocal.getProperty(sPath);
                            if(!oEntry) {
                                oEntry = { "SALES_ORGANISATION":el.SALES_ORGANISATION,
                                           "PRODUCT_GROUP":el.PRODUCT_GROUP,
                                           "REVENUE":iRevenue,
                                           "CURRENCY":el.CURRENCY };
                                this.oSalesModelLocal.setProperty(sPath,oEntry);
                            } else {
                                if(oEntry.REVENUE) {
                                    oEntry.REVENUE = oEntry.REVENUE + iRevenue;
                                } else {
                                    oEntry.REVENUE = iRevenue;
                                }
                                oEntry.CURRENCY = el.CURRENCY;
                            }
                        }
                    }
                    
                    readPredictedData();
		  
    		    }.bind(this);
    		    
                this.oSalesModelLocal.setProperty("/SalesYearMonthProductGroup",{});
                this.oSalesModelLocal.setProperty("/SalesYearMonth",{});
                this.oSalesModelLocal.setProperty("/SalesMonth",{});
                this.oSalesModelLocal.setProperty("/SalesSalesOrgProdGroup",{});
    		    
                let mParams = {
                    success: processData,
                    urlParameters: { '$select': 'YEAR,MONTH,date,SALES_ORGANISATION,PRODUCT_GROUP,REVENUE,CURRENCY' },
                    filters: aFilter
                  };
                /* finally call read from sales cube */
                this.oSalesModel.read("/SalesMonthProductGroup", mParams );
		    } else {
                this.oBusyDialog.close();
		    }
		},
		
		configureChart: function(rereadSalesData = true) {
		    
            this.colorPalette = ["#5cbae6", "#b6d957", "#fac364"];
            this.colorPaletteManul = ['#5cbae6' , '#b6d957', '#fac364'];
            var chartContainer = this.getView().byId("ChartContainer");
            chartContainer.detachContentChange();
            
            let callback = function() {
                // actual chart configuration
                //TODO: add chart with aggregated values for multiple product groups
                let oDataset, feedValues1, feedValues2, feedValues3, feedAxisLabels, sVizTitle;
                let i18n = this.getResourceBundle();
                switch(this.oVizFrame.getVizType()) {
                    case "column":
                        sVizTitle = i18n.getText("vizTitleColumnChart");
                        oDataset = new sap.viz.ui5.data.FlattenedDataset({
                          dimensions: [{
                            name: i18n.getText("SalesOrg"),
                            displayValue: { path: "SALES_ORGANISATION", formatter: this.formatter.salesOrg.bind(this) },
                            dataType: 'string',
                            value: "{SALES_ORGANISATION}"
                          },{
                            name: i18n.getText("ProductGroup"),
                            dataType: 'string',
                            value: "{PRODUCT_GROUP}"
                          }],
                          measures: [{
                              name: i18n.getText("Revenue"),
                              value: '{REVENUE}'
                            },{
                              name: i18n.getText("RevenuePredicted"),
                              value: '{REVENUE_PREDICTED}'
                            }],
                          data: {
                            path: "/SalesSalesOrgProdGroup"
                          }
                        });
                        feedValues1 = new sap.viz.ui5.controls.common.feeds.FeedItem({
                            'uid': "primaryValues",
                            'type': "Measure",
                            'values': [i18n.getText("Revenue"),i18n.getText("RevenuePredicted")]
                        });
                        feedAxisLabels = new sap.viz.ui5.controls.common.feeds.FeedItem({
                            'uid': "axisLabels",
                            'type': "Dimension",
                            'values': [i18n.getText("SalesOrg"),i18n.getText("ProductGroup")]
                        });
                        break;
                        
                    case "line":
                        sVizTitle = i18n.getText("vizTitleLineChart");
                        oDataset = new sap.viz.ui5.data.FlattenedDataset({
                          dimensions: [{
                            name: i18n.getText("Month"),
                            dataType: 'string',
                            value: "{MONTH}",
                            displayValue: { path: "MONTH", formatter: this.formatter.month.bind(this) }
                          }],
                          measures: [{
                              name: i18n.getText("Revenue"),
                              value: '{REVENUE}'
                            },{
                              name: i18n.getText("RevenuePredicted"),
                              value: '{REVENUE_PREDICTED}'
                            }],
                          data: {
                            path: "/SalesMonth"
                          }
                        });
                        feedValues1 = new sap.viz.ui5.controls.common.feeds.FeedItem({
                            'uid': "primaryValues",
                            'type': "Measure",
                            'values': [i18n.getText("Revenue"),i18n.getText("RevenuePredicted")]
                        });
                        feedAxisLabels = new sap.viz.ui5.controls.common.feeds.FeedItem({
                            'uid': "axisLabels",
                            'type': "Dimension",
                            'values': [i18n.getText("Month")]
                        });
                        break;
                        
                    case "timeseries_line":
                        sVizTitle = i18n.getText("vizTitleTimeseries");
                        oDataset = new sap.viz.ui5.data.FlattenedDataset({
                          dimensions: [{
                            name: i18n.getText("Date"),
                            dataType: 'date',
                            value: "{date}"
                          }],
                          measures: [{
                              name: i18n.getText("Revenue"),
                              value: '{REVENUE}'
                            },{
                              name: i18n.getText("RevenuePredicted"),
                              value: '{REVENUE_PREDICTED}'
                            }],
                          data: {
                            path: "/SalesYearMonth"
                          }
                        });
                        feedValues1 = new sap.viz.ui5.controls.common.feeds.FeedItem({
                            'uid': "valueAxis",
                            'type': "Measure",
                            'values': [i18n.getText("Revenue"),i18n.getText("RevenuePredicted")]
                        });
                        feedAxisLabels = new sap.viz.ui5.controls.common.feeds.FeedItem({
                            'uid': "timeAxis",
                            'type': "Dimension",
                            'values': [i18n.getText("Date")]
                        });
                        break;
                }
        
                // -------- VizFrame ----------------
                this.oVizFrame.setDataset(oDataset);
                this.oVizFrame.setModel(this.oSalesModelLocal);
                this.oVizFrame.destroyFeeds();
                if(feedValues1) { this.oVizFrame.addFeed(feedValues1); }
                if(feedValues2) { this.oVizFrame.addFeed(feedValues2); }
                if(feedValues3) { this.oVizFrame.addFeed(feedValues3); }
                this.oVizFrame.addFeed(feedAxisLabels);
                this.oVizFrame.setVizProperties({
                  general: {
                      groupData: false
                  },
                  plotArea: {
                    window: {
                        start: "firstDataPoint",
                        end: "lastDataPoint"
                    },
                    dataLabel: {
                      visible: true
                    },
                    colorPalette: this.colorPalette
                  },
                  legend: {
                    title: {
                      visible: false
                    }
                  },
                  title: {
                    visible: true,
                    text: sVizTitle
                  }
                });
           
                var popoverProps = {};
                this.chartPopover = new sap.viz.ui5.controls.Popover(popoverProps);
        
                this.chartPopover.setActionItems();
                this.chartPopover.connect(this.oVizFrame.getVizUid());
                
                this.oBusyDialog.close();
                
            }.bind(this);
		    
		    if(this.oRouteArguments.chartType === "table") {
		        this.getView().byId("chartBox").setVisible(false);
		        this.getView().byId("tableBox").setVisible(true);
		        callback = function(){this.oBusyDialog.close();}.bind(this);
		    } else {
		        this.getView().byId("chartBox").setVisible(true);
		        this.getView().byId("tableBox").setVisible(false);
		    }
            
            if(rereadSalesData) {
                this.rereadSalesData(callback);
            } else {
                callback();
            }
            
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		
		onNavToDetail: function() {
		    this.oSplitView.toDetail(this.getView().byId("detail"));
		},
		
		onToggleSettings: function() {
			var oSplitContainer = this.getView().byId("settingsContainer");
			oSplitContainer.setShowSecondaryContent(!oSplitContainer.getShowSecondaryContent());
		},
		
		onSwitchChartType: function(oEvent) {
		    let sKey = oEvent.getParameter("key");
		    if(sKey !== "table") {
		        this.oVizFrame.setVizType(sKey);
		    }
		},
		
		onAddNewListItemDialog: function() {
		    
			if (!this._oAddNewListItemDialog) {
			    let oSelectProductGroup = new sap.m.Select({
					                id: 'selectProductGroup',
					                width: '100%',
					                name: 'group',
					                forceSelection: false,
					                items: []
					            })
					            .bindItems({
                                    path: 'sales>/ProductGroups',
            				        sorter: { path: 'PRODUCT_GROUP' },
            				        template: new sap.ui.core.Item({
            				            key: { path: 'sales>PRODUCT_GROUP' },
            				            text: { path: 'sales>PRODUCT_GROUP', formatter: this.formatter.setEmptyText.bind(this) }
            				        })
            			        });
			    let oSelectSalesOrg = new sap.m.Select({
					                id: 'selectSalesOrg',
					                width: '100%',
					                name: 'salesorg',
					                forceSelection: false
					            })
					            .bindItems({
                                    path: 'sales>/SalesOrg',
            				        sorter: { path: 'SHORT_TEXT' },
            				        template: new sap.ui.core.Item({
            				            key: { path: 'sales>SALES_ORGANISATION' },
            				            text: { path: 'sales>SHORT_TEXT' }
            				        }),
            				        filters: [
            				            new sap.ui.model.Filter("LANGU", sap.ui.model.FilterOperator.EQ, this.sLANGU, sap.ui.model.FilterType.Application)
            				        ]
            			        });
		    
				let aInputs = [
    				oSelectProductGroup,
    				oSelectSalesOrg
    			];
    			let cleanupInputs = function() {
        	        jQuery.each(aInputs, function (i, oInput) {
                        oInput.setValueState(sap.ui.core.ValueState.None);
                        oInput.setSelectedItem(null);
        	        });
    			}.bind(this);
				this._oAddNewListItemDialog = new sap.m.Dialog({
					title: this.getResourceBundle().getText("addNewProductGroup"),
					draggable: true,
					stretch: jQuery.device.is.phone,
					content: [
					    new sap.ui.layout.VerticalLayout({
					        width: '100%',
					        content: [
					            new sap.m.Label({
					                text: this.getResourceBundle().getText("ProductGroup"),
					                labelFor: 'selectProductGroup'
					            }).addStyleClass("sapUiTinyMarginTop"),
					            oSelectProductGroup,
					            new sap.m.Label({
					                text: this.getResourceBundle().getText("SalesOrg"),
					                labelFor: 'selectSalesOrg'
					            }).addStyleClass("sapUiTinyMarginTop"),
					            oSelectSalesOrg
					        ]
					    }).addStyleClass("sapUiContentPadding")
					],
					buttons: [
						new sap.m.Button({
							text : this.getResourceBundle().getText("save"),
							icon: 'sap-icon://save',
					        type: sap.m.ButtonType.Accept,
							press : function() {
							    /* validate inputs */
                    			let bValidationError = false;
                    			// check that inputs are not empty
                    			jQuery.each(aInputs, function (i, oInput) {
                    				try {
                    				    let oItem = oInput.getSelectedItem();
                    					oItem.getKey();
                    				} catch (oException) {
                    					oInput.setValueState(sap.ui.core.ValueState.Error);
                    					bValidationError = true;
                    				}
                    			});
							    if(!bValidationError) {
							        let sProdGroup = oSelectProductGroup.getSelectedItem().getKey();
							        let sSalesOrg = oSelectSalesOrg.getSelectedItem().getKey();
							        let sProdGroupKey = sProdGroup + "_" + sSalesOrg;
							        let sPath = "/ProductGroupList/" + sProdGroupKey;
							        if(this.oModel.getProperty(sPath)) {
                						sap.m.MessageToast.show(this.getResourceBundle().getText("itemAlreadyExists"));
							        } else {
                                        this.oModel.setProperty(sPath,{
                                            key: sProdGroup,
                                            salesOrg: sSalesOrg
                                        });
                                        this.addRouteProdGroupKey(sProdGroupKey);
                						sap.m.MessageToast.show(this.getResourceBundle().getText("itemAdded"));
        								this._oAddNewListItemDialog.close();
        								//cleanupInputs();
        								oSelectProductGroup.setSelectedItem(null);
							        }
							    }
							}.bind(this)
						}),
						new sap.m.Button({
							text : this.getResourceBundle().getText("cancel"),
							icon: 'sap-icon://decline',
					        type: sap.m.ButtonType.Reject,
							press : function() {
								this._oAddNewListItemDialog.close();
    							cleanupInputs();
							}.bind(this)
						})
					],
					escapeHandler: function(oPromise) {
						if (!this._oAddNewListItemDialogConfirmEscape) {
							this._oAddNewListItemDialogConfirmEscape = new sap.m.Dialog({
								icon : 'sap-icon://question-mark',
								title : this.getResourceBundle().getText("confirmEscapeTitle"),
								content : [
									new sap.m.Text({
										text : this.getResourceBundle().getText("confirmEscapeText")
									})
								],
								type : sap.m.DialogType.Message,
								buttons : [
									new sap.m.Button({
										text : this.getResourceBundle().getText("yes"),
										press : function() {
											this._oAddNewListItemDialogConfirmEscape.close();
											oPromise.resolve();
    								        cleanupInputs();
										}.bind(this)
									}),
									new sap.m.Button({
										text : this.getResourceBundle().getText("no"),
										press : function() {
											this._oAddNewListItemDialogConfirmEscape.close();
											oPromise.reject();
										}.bind(this)
									})
								]
							});
						}

						this._oAddNewListItemDialogConfirmEscape.open();
					}.bind(this)
				});
			}
			this._oAddNewListItemDialog.setModel(this.getModel("sales"),"sales");
			this._oAddNewListItemDialog.open();
		},
		
		onDeleteSelectedListItem: function(oEvent) {
		    
			let oList = oEvent.getSource(),
				oItem = oEvent.getParameter("listItem");
		    
		    let sProdGroup = oItem.data("key");
		    let sSalesOrg = oItem.data("salesorg");
		    let sId = sProdGroup + "_" + sSalesOrg;
		    
		    let oDialog = new sap.m.Dialog({
				title: this.getResourceBundle().getText("confirmDeletionTitle"),
				icon: 'sap-icon://delete',
				type: sap.m.DialogType.Message,
				content: new sap.m.Text({ text: this.getResourceBundle().getText("confirmDeletionText") }),
				beginButton: new sap.m.Button({
					text: this.getResourceBundle().getText("yes"),
					type: sap.m.ButtonType.Default,
					press: function () {
			            // after deletion put the focus back to the list
			            oList.attachEventOnce("updateFinished", oList.focus, oList);
			            // send a delete request to the odata service
			            let oGroups = this.oModel.getProperty("/ProductGroupList");
			            delete oGroups[sId];
			            this.removeRouteProdGroupKey(sId);
			            this.oModel.refresh();
						sap.m.MessageToast.show(this.getResourceBundle().getText("deletedSuccessfully"));
						oDialog.close();
					}.bind(this)
				}),
				endButton: new sap.m.Button({
					text: this.getResourceBundle().getText("no"),
					type: sap.m.ButtonType.Transparent,
					press: function () {
						oDialog.close();
					}
				}),
				afterClose: function() {
					oDialog.destroy();
				}
			});
			oDialog.open();
		},
		
		addRouteProdGroupKey: function(sKey) {
		    if(this.oRouteArguments.productGroups) {
		    this.oRouteArguments.productGroups = this.oRouteArguments.productGroups + "," + sKey;
		    } else {
		        this.oRouteArguments.productGroups = sKey;
		    }
			this.getRouter().navTo("predict", this.oRouteArguments, true);
		},
		
		removeRouteProdGroupKey: function(sKey) {
		    this.oRouteArguments.productGroups = this.oRouteArguments.productGroups.replace(sKey + ",", '');
		    this.oRouteArguments.productGroups = this.oRouteArguments.productGroups.replace("," + sKey, '');
		    this.oRouteArguments.productGroups = this.oRouteArguments.productGroups.replace(sKey, '');
			this.getRouter().navTo("predict", this.oRouteArguments, true);
		}

	});

});