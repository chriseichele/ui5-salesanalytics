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
		}

	});

});