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
            
		    this.oIconTabBarCharts = this.getView().byId("IconTabBarChartTypes");
		    this.oSplitView = this.getView().byId("SplitView");
		    this.oVizFrame = this.getView().byId("VizFrame");
            
			this.getView().byId("detail").attachNavButtonPress(this._onNavBack, this);
			this.getRouter().getRoute("predict").attachPatternMatched(this._onObjectMatched, this);
			
			let me = this;
			this.oIconTabBarCharts.attachEvent('select', function attachTabSelect(oEvent) {
				me._onTabSelect(oEvent, this);
			});
		    
		    let aChartTypes = ["column", "dual_column", "bar", "dual_bar", "stacked_bar", "stacked_column", "line",
            			       "dual_line", "combination", "bullet", "time_bullet", "bubble", "time_bubble", 
            			       "pie", "donut", "timeseries_column", "timeseries_line", "timeseries_scatter", 
            			       "timeseries_bubble", "timeseries_stacked_column", "timeseries_100_stacked_column", 
            			       "timeseries_bullet", "timeseries_waterfall", "scatter", "vertical_bullet", "dual_stacked_bar", 
            			       "100_stacked_bar", "100_dual_stacked_bar", "dual_stacked_column", "100_stacked_column", 
            			       "100_dual_stacked_column", "stacked_combination", "horizontal_stacked_combination", 
            			       "dual_stacked_combination", "dual_horizontal_stacked_combination", "heatmap",
            			       "waterfall", "horizontal_waterfall"];
            aChartTypes.forEach(function(sKey){
                me.oIconTabBarCharts.addItem(new sap.m.IconTabFilter({"key":sKey,"text":sKey}));
            });
		    
		    this.configureChart();
		    
		},
		
		_onNavBack: function() {
		    this.oSplitView.backMaster();
            //this.oSplitView.toMaster(this.getView().byId("master"));
        },
		
		_onObjectMatched: function (oEvent) {
		    let sKey = oEvent.getParameter("arguments").chartType;
		    this.oIconTabBarCharts.setSelectedKey(sKey);
            this.oVizFrame.setVizType(this.oIconTabBarCharts.getSelectedKey());
            
            let sSalesOrg = oEvent.getParameter("arguments").salesOrg;
            let sProductGroups = oEvent.getParameter("arguments").productGroups;
            if (sSalesOrg && sProductGroups) {
                let aProductGroups = sProductGroups.split(",");
                aProductGroups.forEach(function(sProdGroup) {
                    this.oModel.setProperty("/ProductGroupList/" + sProdGroup + "_" + sSalesOrg,{
                        key: sProdGroup,
                        salesOrg: sSalesOrg
                    });
                }, this);
            }
		},
		
		_onTabSelect: function (oEvent, oElement) {
			if(oEvent.getParameter("key")) {
				this.getRouter().navTo("predict", { 
					chartType : oEvent.getParameter("key") 
				}, true);
			}
		},
		
		configureChart: function() {
		    
            //way 1: use the route 
            this.colorPalette = ["#5cbae6", "#b6d957", "#fac364"];
            this.colorPaletteManul = ['#5cbae6' , '#b6d957', '#fac364'];
            var chartContainer = this.getView().byId("ChartContainer");
            chartContainer.detachContentChange();
            var amModel = new sap.ui.model.json.JSONModel("https://sapui5.hana.ondemand.com/test-resources/sap/viz/demokit/chartdemo/ByItemCity_sum.json");
            var oDataset = new sap.viz.ui5.data.FlattenedDataset({
              dimensions: [{
                name: 'Item Category',
                value: "{Item Category}"
              }],
              measures: [{
                  name: 'Profit',
                  value: '{Profit}'
                },
    
                {
                  name: "Cost",
                  value: "{Cost}"
                }, {
                  name: "Revenue",
                  value: '{Revenue}'
                }
              ],
              data: {
                path: "/book"
              }
            });
            var feedPrimaryValues = new sap.viz.ui5.controls.common.feeds.FeedItem({
                'uid': "primaryValues",
                'type': "Measure",
                'values': ["Profit", "Cost", 'Revenue']
              }),
              feedAxisLabels = new sap.viz.ui5.controls.common.feeds.FeedItem({
                'uid': "axisLabels",
                'type': "Dimension",
                'values': ["Item Category"]
              });
    
            // -------- VizFrame ----------------
            this.oVizFrame.setDataset(oDataset);
            this.oVizFrame.setModel(amModel);
            this.oVizFrame.addFeed(feedPrimaryValues);
            this.oVizFrame.addFeed(feedAxisLabels);
            this.oVizFrame.setVizProperties({
              plotArea: {
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
                text: 'Profit and Cost and Revenue by Item Category'
              }
            });
       
            var popoverProps = {};
            this.chartPopover = new sap.viz.ui5.controls.Popover(popoverProps);
    
            this.chartPopover.setActionItems();
            this.chartPopover.connect(this.oVizFrame.getVizUid());
            
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		
		onNavToDetail: function() {
		    this.oSplitView.toDetail(this.getView().byId("detail"));
		},
		
		onSharePress: function() {
			let oShareSheet = this.byId("shareSheet");
			oShareSheet.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			oShareSheet.openBy(this.byId("shareButton"));
		},
		
		onShareEmailPress: function() {
		    let sSubject = this.oModel.getProperty("/shareSendEmailSubject");
		    let sMessage = this.oModel.getProperty("/shareSendEmailMessage");
		    if(!sMessage){sMessage = window.location.href;}
			sap.m.URLHelper.triggerEmail(
				null,
				sSubject,
				sMessage
			);
		},
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
		
		onToggleSettings: function() {
			var oSplitContainer = this.getView().byId("settingsContainer");
			oSplitContainer.setShowSecondaryContent(!oSplitContainer.getShowSecondaryContent());
		},
		
		onSwitchChartType: function(oEvent) {
		    let sKey = oEvent.getParameter("key");
		    this.oVizFrame.setVizType(sKey);
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
							        let sPath = "/ProductGroupList/" + sProdGroup + "_" + sSalesOrg;
							        if(this.oModel.getProperty(sPath)) {
                						sap.m.MessageToast.show(this.getResourceBundle().getText("itemAlreadyExists"));
							        } else {
                                        this.oModel.setProperty(sPath,{
                                            key: sProdGroup,
                                            salesOrg: sSalesOrg
                                        });
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
		}

	});

});