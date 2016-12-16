sap.ui.define([
	"de/fis/applicationwizard/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"de/fis/applicationwizard/model/formatter"
], function(BaseController, JSONModel, Filter, FilterOperator, MessageBox, formatter) {
	"use strict";

	return BaseController.extend("de.fis.applicationwizard.controller.Wizard", {

		formatter: formatter,

		onInit: function() {
			var oView = this.getView();

			var oDataModel = this.getModel("applmanModel");
			oDataModel.metadataLoaded().then(this._onMetadataLoaded.bind(this));

			this._oWizard = oView.byId("CreateApplicationWizard");
			this._oNavContainer = oView.byId("wizardNavContainer");
			this._oWizardContentPage = this.getView().byId("wizardContentPage");
			this._oReviewPage = sap.ui.xmlfragment("de.fis.applicationwizard.view.fragment.ReviewPage", this);

			this._oNavContainer.addPage(this._oReviewPage);
			
			var oViewModel = new JSONModel({
				"dateienTitle": this.getResourceBundle().getText("DateienTitleWithCount", [0])
			});

			this.setModel(oViewModel, "wizardView");
			
			this._initialize();
		},

		_onMetadataLoaded: function(oEvent) {
			var oModel = this.getModel("applmanModel");
		},

		_initialize: function() {
			var oMultiBoxPositions = this.getView().byId("multiComboBoxPositions");
			var oMultiBoxSources = this.getView().byId("multiComboBoxSources");
			
			oMultiBoxPositions.clearSelection();
			oMultiBoxSources.clearSelection();
			
			var oDataModel = new JSONModel({
				"Application": {
//					"ApplicantId": "",
					"EnteredBy": "test",
					"EnteredOn": new Date()
				},
				"Applicant": {
					"Salutation": "Herr",
					"Lastname": "Mustermann",
					"Firstname": "Max",
					"Birthdate": new Date(),
					"Picture": "asdf",
					"Street": "Himmelstraße 7",
					"Zipcode": "98765",
					"City": "Gottland",
					"Email": "m.mustermann@gmail.com",
					"Phone": "09876 12345",
					"Mobile": "+49 153 54574559",
					"Gender": "m"
				},
				"Positions": [],
				"Sources": []
			});
			
			this.setModel(oDataModel, "dataModel");
		},
		
		/* =========================================================== */
		/* internal methods */
		/* =========================================================== */

		_handleNavigationToStep: function(iStepNumber) {
			var that = this;

			function fnAfterNavigate() {
				that._oWizard.goToStep(that._oWizard.getSteps()[iStepNumber]);
				that._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this._backToWizardContent();
		},

		_backToWizardContent: function() {
			this._oNavContainer.backToPage(this._oWizardContentPage.getId());
		},

		_handleMessageBoxOpen: function(sMessage, sMessageBoxType) {
			var that = this;
			MessageBox[sMessageBoxType](sMessage, {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function(oAction) {
					switch(oAction) {
					case MessageBox.Action.YES:
						that._initialize();
						that._handleNavigationToStep(0);
						that._oWizard.discardProgress(that._oWizard.getSteps()[0]);
						break;
					case MessageBox.Action.NO:
						break;
					}
				}
			});
		},

		_saveProgress: function() {
			var oModel = this.getModel("applmanModel");
			var oDataModel = this.getModel("dataModel");
			var oApplication = oDataModel.getProperty("/Application");
			oApplication.ApplicantDetails = oDataModel.getProperty("/Applicant");
			oModel.create("/Applications", oApplication, {
				success: function(oData) {
					this._savePositions(oData.ApplicationId, oModel);
					this._saveSources(oData.ApplicationId, oModel);
					console.log(oData);
				}.bind(this)
			});
		},
		
		_savePositions: function(applicationId, oModel) {
			var aPositions = this.getModel("dataModel").getProperty("/Positions");
			// Link the Application with all Positions
			for (var i = 0; i < aPositions.length; i++) {
				var oLink = {
					"uri": "http://localhost:8541/applman/odata.srv/Positions('"+aPositions[i].PositionId+"')"
				};
				oModel.create("/Applications('" + applicationId + "')/$links/Positions", oLink);
			}
		},
		
		_saveSources: function(applicationId, oModel) {
			var aSources = this.getModel("dataModel").getProperty("/Sources");
			// Link the Application with all Sources
			for (var i = 0; i < aSources.length; i++) {
				var oLink = {
					"uri": "http://localhost:8541/applman/odata.srv/Sources('"+aSources[i].SourceId+"')"
				};
				oModel.create("/Applications('" + applicationId + "')/$links/Sources", oLink);
			}
			this._initialize();
		},
		
		/* =========================================================== */
		/* event handlers general */
		/* =========================================================== */

		onWizardCompleted: function() {
			this._oNavContainer.to(this._oReviewPage);
		},

		onWizardCancel: function() {
			var sText = this.getResourceBundle().getText("DialogCancel");
			this._handleMessageBoxOpen(sText, "warning");
		},

		onWizardSubmit: function() {
			this._saveProgress();
			this._handleNavigationToStep(0);
			this._oWizard.discardProgress(this._oWizard.getSteps()[0]);
		},

		/* =========================================================== */
		/* event handlers review page */
		/* =========================================================== */

		editStepOne: function() {
			this._handleNavigationToStep(0);
		},

		editStepTwo: function() {
			this._handleNavigationToStep(1);
		},

		/* =========================================================== */
		/* event handlers (step 2) */
		/* =========================================================== */

		onPositionsFinished: function(oEvent) {
			var aItems = oEvent.getParameter("selectedItems");
			var aPositions = this.getModel("dataModel").getProperty("/Positions");
			aPositions = [];

			for (var i = 0; i < aItems.length; i++) {
				aPositions.push({
					"PositionId": aItems[i].getKey(),
					"Name": aItems[i].getText()
				});
			}
			this.getModel("dataModel").setProperty("/Positions", aPositions);
		},

		onSourcesFinished: function(oEvent) {
			var aItems = oEvent.getParameter("selectedItems");
			var aSources = this.getModel("dataModel").getProperty("/Sources");
			aSources = [];
			
			for (var i = 0; i < aItems.length; i++) {
				aSources.push({
					"SourceId": aItems[i].getKey(),
					"Name": aItems[i].getText()
				});
			}
			this.getModel("dataModel").setProperty("/Sources", aSources);
		},

		/* =========================================================== */
		/* event handlers (step 3) */
		/* =========================================================== */

		onDateienUpdateFinished: function(oEvent) {
			var totalItems = oEvent.getParameter("total");
			var oTable = this.getView().byId("tableDateien");

			if (oTable.getBinding("items").isLengthFinal()) { // Wenn die
																// Länge der
																// geladenen
																// Items "final"
																// ist,
				var sTitle = this.getResourceBundle().getText("wizardDateienTitleWithCount", [totalItems]); // aktualisiere
																											// die
																											// Itemanzahl
				this.getModel("wizardView").setProperty("/dateienTitle", sTitle); // im
																					// Titel
																					// der
																					// Page
			}
		},

		onAddDatei: function(oEvent) {
			var oModel = this.getModel("bewerberModel");
			var aDateien = oModel.getProperty("/Dateien");
			var oDatei = {
				"Anzeigetext": "Eine Datei " + aDateien.length,
				"Dateiname": "Datei/in/einem/Ordner.pdf"
			};

			aDateien.push(oDatei);
			oModel.setProperty("/Dateien", aDateien);
		},

		onDeleteDatei: function(oEvent) {
			/*
			var oModel = this.getModel("bewerberModel");
			var oItem = oEvent.getParameter("listItem");
			var oBindingContext = oItem.getBindingContext("bewerberModel");
			var sPath = oBindingContext.getPath();
			var nIndex = parseInt(sPath.substring(sPath.length - 1, sPath.length));
			var aDateien = oModel.getProperty("/Dateien");

			aDateien.splice(nIndex, 1);
			oModel.setProperty("/Dateien", aDateien);
			*/
		},

		onDeleteFoto: function(oEvent) {
			var oModel = this.getModel("bewerberModel");
			oModel.setProperty("/Fotos", []);
			this.getModel("wizardView").setProperty("/fotoVorhanden", false);
		},

		onUploadComplete: function(oEvent) {

		},

		onUploadPress: function(oEvent) {

		}

	});

});