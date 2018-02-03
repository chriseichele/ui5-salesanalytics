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
		    // initialization of the view
		    
		    // define and set data models
            this.oModel = new JSONModel();
			this.oModel.setData({"pageTitle": this.getResourceBundle().getText("predictViewTitle")});
			this.oModel.setProperty("/ProductGroupList",{});
            this.setModel(this.oModel);
            
            this.oSalesModelLocal = new JSONModel();
            this.setModel(this.oSalesModelLocal,"sales2");
            
			// remember UI controls as controller variables
		    this.oIconTabBarCharts = this.getView().byId("IconTabBarChartTypes");
		    this.oSplitView = this.getView().byId("SplitView");
		    this.oVizFrame = this.getView().byId("VizFrame");
            
            // attach listeners to UI controls
			this.getView().byId("detail").attachNavButtonPress(this._onNavBack, this);
			this.getRouter().getRoute("predict").attachPatternMatched(this._onObjectMatched, this);
			
			let me = this;
			this.oIconTabBarCharts.attachEvent('select', function attachTabSelect(oEvent) {
				me._onTabSelect(oEvent, this);
			});
			
			// define busy dialog, that can be activted, if data is loading
			this.oBusyDialog = new sap.m.BusyDialog();
		    
		},

		onExit : function () {
		    // clean up on exit
			if (this._oAddNewListItemDialog) {
				this._oAddNewListItemDialog.destroy();
			}
			this.oModel = null;
		},

		/* =========================================================== */
		/* routing stuff                                               */
		/* =========================================================== */
		
		_onNavBack: function() {
		    // nav back to left hand container in split view (only relevant on small screens)
		    this.oSplitView.backMaster();
        },
		
		_onObjectMatched: function (oEvent) {
		    // remember route arguments (because they are many)
		    this.oRouteArguments = oEvent.getParameter("arguments");
		    
		    // set chart type
		    let sKey = this.oRouteArguments.chartType;
		    this.oIconTabBarCharts.setSelectedKey(sKey);
            this.oVizFrame.setVizType(this.oIconTabBarCharts.getSelectedKey());
            
            // set dates for time interval pickers
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
            
            // set expected market growth, if set
            let iExpectedMarketGrowth = this.oRouteArguments.expectedMarketGrowth;
            if(iExpectedMarketGrowth && iExpectedMarketGrowth != 0) {
                this.oModel.setProperty("/expectedMarketGrowthOn",true);
                this.oModel.setProperty("/expectedMarketGrowth",iExpectedMarketGrowth);
            } else {
                this.oModel.setProperty("/expectedMarketGrowthOn",false);
                this.oModel.setProperty("/expectedMarketGrowth",0);
            }
            
            // parse product groups array and set in list
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
		    
		    // after route is processed: configure chart data to be displayed
            this.oBusyDialog.open();
		    this.configureChart();
		},
		
		_onTabSelect: function (oEvent) {
		    // change visualization on icon tab select
		    // pause router, to prevent listener of firing reread of the selected data
		    this.getRouter().stop();
		    this.oRouteArguments.chartType = oEvent.getParameter("key");
			if(oEvent.getParameter("key")) {
				this.getRouter().navTo("predict", this.oRouteArguments, true);
			}
			// reconfigure chart without reread of data (filters have not changed)
		    this.configureChart(false);
		    window.setTimeout(function(){this.getRouter().initialize(true);}.bind(this), 1);
		},
		
		addRouteProdGroupKey: function(sKey) {
		    // add new product group to route (to keep bookmarkable link up to date)
		    if(this.oRouteArguments.productGroups) {
		    this.oRouteArguments.productGroups = this.oRouteArguments.productGroups + "," + sKey;
		    } else {
		        this.oRouteArguments.productGroups = sKey;
		    }
		    // update route without creating new entry in the browser history
			this.getRouter().navTo("predict", this.oRouteArguments, true);
		},
		
		removeRouteProdGroupKey: function(sKey) {
		    // remove product group from route (to keep bookmarkable link up to date)
		    this.oRouteArguments.productGroups = this.oRouteArguments.productGroups.replace(sKey + ",", '');
		    this.oRouteArguments.productGroups = this.oRouteArguments.productGroups.replace("," + sKey, '');
		    this.oRouteArguments.productGroups = this.oRouteArguments.productGroups.replace(sKey, '');
		    // update route without creating new entry in the browser history
			this.getRouter().navTo("predict", this.oRouteArguments, true);
		},
		
		onChangeMarketGrowth: function(oEvent) {
		    // remember market growth in route (to keep bookmarkable link up to date)
		    if(oEvent.getParameter("value")) {
		        this.oRouteArguments.expectedMarketGrowth = oEvent.getParameter("value");
			    this.getRouter().navTo("predict", this.oRouteArguments, true);
		    }
		},
		
		onDate1Select: function(oEvent) {
		    // remember date range for existing data in route (to keep bookmarkable link up to date)
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
		    // remember date range for predicted data in route (to keep bookmarkable link up to date)
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
		
		onNavToDetail: function() {
		    // display main content of splitter container (only relevant on small screens)
		    this.oSplitView.toDetail(this.getView().byId("detail"));
		},
		
		onToggleSettings: function() {
		    // display side panel of splitter container (only relevant on medium size screens)
			var oSplitContainer = this.getView().byId("settingsContainer");
			oSplitContainer.setShowSecondaryContent(!oSplitContainer.getShowSecondaryContent());
		},

		/* =========================================================== */
		/* handlers from view                                          */
		/* =========================================================== */
		
		onSwitchChartType: function(oEvent) {
		    // set new chart type in visulaization container
		    let sKey = oEvent.getParameter("key");
		    if(sKey !== "table") {
		        this.oVizFrame.setVizType(sKey);
		    }
		},
		
		onAddNewListItemDialog: function() {
		    // new product group button was pressed
			if (!this._oAddNewListItemDialog) {
			    // create select control for product groups
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
			    // create select control for sales orgs
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
		        // array of all input elements
				let aInputs = [
    				oSelectProductGroup,
    				oSelectSalesOrg
    			];
    			// define cleanup function for these inputs
    			let cleanupInputs = function() {
        	        jQuery.each(aInputs, function (i, oInput) {
                        oInput.setValueState(sap.ui.core.ValueState.None);
                        oInput.setSelectedItem(null);
        	        });
    			}.bind(this);
    			
    			// create popup dialog control containing the select controls from above
    			// (controls can be created also via javascript functions instead of xml views and fragments.
    			//  this is more flexible but also more complex)
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
					    // action buttons in dialog
						new sap.m.Button({
							text : this.getResourceBundle().getText("save"),
							icon: 'sap-icon://save',
					        type: sap.m.ButtonType.Accept,
							press : function() {
							    // save button was pressed
							    // validate inputs
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
							        // if there was no error -> do save
							        let sProdGroup = oSelectProductGroup.getSelectedItem().getKey();
							        let sSalesOrg = oSelectSalesOrg.getSelectedItem().getKey();
							        let sProdGroupKey = sProdGroup + "_" + sSalesOrg;
							        let sPath = "/ProductGroupList/" + sProdGroupKey;
							        // check if item at this path already exists in model
							        if(this.oModel.getProperty(sPath)) {
							            // we do not need redundant data!
                						sap.m.MessageToast.show(this.getResourceBundle().getText("itemAlreadyExists"));
							        } else {
							            // yeah, finally we can add the new item to the model
                                        this.oModel.setProperty(sPath,{
                                            key: sProdGroup,
                                            salesOrg: sSalesOrg
                                        });
                                        this.addRouteProdGroupKey(sProdGroupKey);
                                        // sucess message
                						sap.m.MessageToast.show(this.getResourceBundle().getText("itemAdded"));
        								this._oAddNewListItemDialog.close();
        								// only clean up product group and keep sales org (it is likely the user wants to add another prod group of this sales org)
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
							    // cancel button pressed
							    // cleanup inputs and close dialog
								this._oAddNewListItemDialog.close();
    							cleanupInputs();
							}.bind(this)
						})
					],
					escapeHandler: function(oPromise) {
					    // user has clicked the escape keyboard button
						if (!this._oAddNewListItemDialogConfirmEscape) {
							this._oAddNewListItemDialogConfirmEscape = new sap.m.Dialog({
							    // create confirm popup, to prevent closing by accident
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
										    // yes, really close
											this._oAddNewListItemDialogConfirmEscape.close();
											oPromise.resolve();
    								        cleanupInputs();
										}.bind(this)
									}),
									new sap.m.Button({
										text : this.getResourceBundle().getText("no"),
										press : function() {
										    // no, keep me inside the dialog
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
			// bind the data model to the dialog
			this._oAddNewListItemDialog.setModel(this.getModel("sales"),"sales");
			// finally open the dialog, so it can be rendered in the view
			this._oAddNewListItemDialog.open();
		},
		
		onDeleteSelectedListItem: function(oEvent) {
		    // delete product group out of the list
			let oList = oEvent.getSource(),
				oItem = oEvent.getParameter("listItem");
		    
		    let sProdGroup = oItem.data("key");
		    let sSalesOrg = oItem.data("salesorg");
		    let sId = sProdGroup + "_" + sSalesOrg;
		    
		    // create popup dialog to ask first, if the user is really sure
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
			            let oGroups = this.oModel.getProperty("/ProductGroupList");
			            // delete out of model
			            delete oGroups[sId];
			            this.removeRouteProdGroupKey(sId);
			            // refresh model, so the view is notified of the change and is rendered again
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

		/* =========================================================== */
		/* help function                                               */
		/* =========================================================== */
		
		rereadSalesData: function(callback) {
		    // reread sales data from backend service
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
		        // build filter to handle only elements inside the ranges
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
            
            // build filter allowing only the product groups out of the list               
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
		    
		    // set previously configured filter in filter array
		    if(oFilterYears && oFilterProdGroups) {
		        aFilter.push(new sap.ui.model.Filter({filters:[oFilterYears,oFilterProdGroups],and:true}));
		    } else if(oFilterProdGroups && this.oModel.getProperty("/dateStart2") ) {
		        aFilter.push(oFilterProdGroups);
		    }
		    
		    // only if there are filter in the array, do the request
		    if(aFilter.length > 0) {
		        let readPredictedData = function() {
                    let sProductGroups = this.oRouteArguments.productGroups;
                    if (sProductGroups) {
                        sProductGroups.split(",").forEach(function(sProdGroupSalesOrg) {
                            let aKeys = sProdGroupSalesOrg.split("_");
                            let sProdGroup = aKeys[0];
                            let sSalesOrg = aKeys[1];
                            // now we have every product group sales org combination at this loop level
                            // iterate over years and months
                            
                            let growthPercent
                            if(this.oModel.getProperty("/expectedMarketGrowthOn")){
                                growthPercent = this.oModel.getProperty("/expectedMarketGrowth") / 100;
                            } else {
                                growthPercent = 0
                            }
                            let ds2 = this.oModel.getProperty("/dateStart2");
                            let de2 = this.oModel.getProperty("/dateEnd2");
                            let iYearStart2 = ds2.getFullYear();
                            let iMonthStart2 = ds2.getMonth() + 1;
                            let iYearEnd2 = de2.getFullYear();
                            let iMonthEnd2 = de2.getMonth() + 1;
                            let iYear = iYearStart2;
                            let iMonth = iMonthStart2;
                            
                            // request data from the prediction service
                            let loadPredictedData = function(y,m,org,group){
                                
                                // asynchronus ajax call
                                jQuery.ajax( {
                                     type:'GET',
                                     url:'model/predict.xsjs' + '?year=' + y 
                                                              + '&month=' + m 
                                                              + '&sales_org=' + org 
                                                              + '&product_group=' + group
                                                              + '&market_growth=' + growthPercent,
                                     success:function(data) {
                                        // save returned predicted value on different aggregation levels for charts
                                        let iRevenuePredicted = parseFloat(data);
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
                                        // call callback again, after read data is processed
                                        callback();
                                     }.bind(this)
                                });
                                
                            }.bind(this);
                            
                            // loop over years and months and call the prediction method
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
		        
		        // process data of the sales odata service
    		    let processData = function(oData) {
		            
                    let items = oData.results;
                    for(let k in items) {
                        let el = items[k];
                        if (typeof el !== 'function') {
                            // save data on different aggregation levels for charts
                            
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
                    
                    // read predicted data, after sales data was read
                    readPredictedData();
		  
    		    }.bind(this);
    		    
    		    // clear Data model propertys 
    		    // be careful: propertys can only be created, if the previous elemnts in the path are existing
    		    // deep paths cannot be created in one step and there is no error message, if it has not worked!
                this.oSalesModelLocal.setProperty("/SalesYearMonthProductGroup",{});
                this.oSalesModelLocal.setProperty("/SalesYearMonth",{});
                this.oSalesModelLocal.setProperty("/SalesMonth",{});
                this.oSalesModelLocal.setProperty("/SalesSalesOrgProdGroup",{});
    		    
                let mParams = {
                    success: processData,
                    urlParameters: { '$select': 'YEAR,MONTH,date,SALES_ORGANISATION,PRODUCT_GROUP,REVENUE,CURRENCY' },
                    filters: aFilter
                  };
                // finally call read from sales cube
                this.oSalesModel.read("/SalesMonthProductGroup", mParams );
		    } else {
		        // if no filter / no request, simply close the busy dialog and finish
                this.oBusyDialog.close();
		    }
		},
		
		configureChart: function(rereadSalesData = true) {
		    // configure chart control
            this.colorPalette = ["#5cbae6", "#b6d957", "#fac364"];
            this.colorPaletteManul = ['#5cbae6' , '#b6d957', '#fac364'];
            var chartContainer = this.getView().byId("ChartContainer");
            chartContainer.detachContentChange();
            
            let callback = function() {
                // actual chart configuration as callback after read of data
                let oDataset, feedValues1, feedValues2, feedValues3, feedAxisLabels, sVizTitle;
                let i18n = this.getResourceBundle();
                // switch configuration based on chart type
                // bind model and data to the axis
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
                            path: "/SalesSalesOrgProdGroup",
                            sorter: [new sap.ui.model.Sorter("SALES_ORGANISATION", false, true),new sap.ui.model.Sorter("PRODUCT_GROUP", false, true)]
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
        
                // set model and dataset to the viz frame and display chart
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
                
                // done
                this.oBusyDialog.close();
                
            }.bind(this);
		    
		    if(this.oRouteArguments.chartType === "table") {
		        // display table view instead of chart control
		        this.getView().byId("chartBox").setVisible(false);
		        this.getView().byId("tableBox").setVisible(true);
		        // overwrite callback: on table view the chart does not need to be rendered
		        callback = function(){this.oBusyDialog.close();}.bind(this);
		    } else {
		        // display chart control and hide table view
		        this.getView().byId("chartBox").setVisible(true);
		        this.getView().byId("tableBox").setVisible(false);
		    }
            
            if(rereadSalesData) {
                // reread sales data and then call chart configuration as callback
                this.rereadSalesData(callback);
            } else {
                // simply call chart configuration directly, without calling the reread first
                callback();
            }
            
		}

	});

});