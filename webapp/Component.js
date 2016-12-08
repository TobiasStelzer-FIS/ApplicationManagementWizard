sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"de/fis/applicationwizard/model/models"
], function(UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("de.fis.applicationwizard.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			
			var sServiceUrl = this.getMetadata().getManifestEntry("sap.app").dataSources.bewerbungservice.uri;
			var oBewerbungverwaltungModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl, {
				json: true,
				defaultBindingMode: "TwoWay",
				loadMetadataAsync: true
			});
			this.setModel(oBewerbungverwaltungModel, "dataModel");			
			
			// initialize router
			this.getRouter().initialize();
		}
	});

});