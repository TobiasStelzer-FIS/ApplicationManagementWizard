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

		/**
		 * Resets the dataModel of the View
		 * 
		 * @private
		 */
		_initialize: function() {
			var oMultiBoxPositions = this.getView().byId("multiComboBoxPositions");
			var oMultiBoxSources = this.getView().byId("multiComboBoxSources");
			
			oMultiBoxPositions.clearSelection();
			oMultiBoxSources.clearSelection();
			
			var oDataModel = new JSONModel({
				"Application": {
					"EnteredBy": "test",
					"EnteredOn": new Date()
				},
				"Applicant": {
					"Salutation": "Herr",
					"Lastname": "Mustermann",
					"Firstname": "Max",
					"Birthdate": new Date(),
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
		/**
		 * Navigates to a specified step on the Wizard Page
		 * 
		 * @param iStepNumber: The number of the step to navigate to
		 * @private
		 */
		_handleNavigationToStep: function(iStepNumber) {
			var that = this;

			function fnAfterNavigate() {
				that._oWizard.goToStep(that._oWizard.getSteps()[iStepNumber]);
				that._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this._backToWizardContent();
		},
		
		/**
		 * Navigates to the Wizard Page
		 * 
		 * @private
		 */
		_backToWizardContent: function() {
			this._oNavContainer.backToPage(this._oWizardContentPage.getId());
		},
		
		/**
		 * Opens a MessageBox which let's you decide if you 
		 * really want to cancel the Entry
		 * 
		 * @param sMessage: The Messages text
		 * @param sMessageBoxType: The type of the MessageBox (e.g. "warning")
		 * @private
		 */
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
		
		/**
		 * Sends the create-request with the Application data 
		 * to the service. If that was successful it also calls:
		 * 		_saveProgress() and _savePositions()
		 * 
		 * @private
		 */
		_saveProgress: function() {
			var oModel = this.getModel("applmanModel");
			var oDataModel = this.getModel("dataModel");
			var oApplication = oDataModel.getProperty("/Application");
			oApplication.ApplicantDetails = oDataModel.getProperty("/Applicant");
			oModel.create("/Applications", oApplication, {
				success: function(oData) {
					this._linkPositions(oData.ApplicationId, oModel);
					this._linkSources(oData.ApplicationId, oModel);
					this._linkStatus(oData.ApplicationId, oModel);
					this._uploadPicture(oData.ApplicationId);
					this._initialize();
				}.bind(this)
			});
		},
		
		/**
		 * Sends create-request to the service for establishing
		 * the links between Position and Application
		 * 
		 * @param applicationId: The Id of a previously created application
		 * @param oModel: The ODataModel to send the request to
		 * @private
		 */
		_linkPositions: function(applicationId, oModel) {
			var aPositions = this.getModel("dataModel").getProperty("/Positions");
			// Link the Application with all Positions
			for (var i = 0; i < aPositions.length; i++) {
				var oLink = {
					"uri": "https://applmanserverp1942281469trial.hanatrial.ondemand.com:443/applman/odata.srv/Positions('"+aPositions[i].PositionId+"')"
				};
				oModel.create("/Applications('" + applicationId + "')/$links/Positions", oLink);
			}
		},
		
		/**
		 * Sends create-request to the service for establishing
		 * the links between Source and Application
		 * 
		 * @param applicationId: The Id of a previously created application
		 * @param oModel: The ODataModel to send the request to
		 * @private
		 */
		_linkSources: function(applicationId, oModel) {
			var aSources = this.getModel("dataModel").getProperty("/Sources");
			// Link the Application with all Sources
			for (var i = 0; i < aSources.length; i++) {
				var oLink = {
					"uri": "https://applmanserverp1942281469trial.hanatrial.ondemand.com:443/applman/odata.srv/Sources('"+aSources[i].SourceId+"')"
				};
				oModel.create("/Applications('" + applicationId + "')/$links/Sources", oLink);
			}
		},
		
		/**
		 * Sends create-request to the service for establishing
		 * a link between Status (with ID '1') and Application
		 * 
		 * @param applicationId: The Id of a previously created application
		 * @param oModel: The ODataModel to send the request to
		 * @private
		 */
		_linkStatus: function(applicationId, oModel) {
			// Link the Application with the default Status
			var oLink = {
				"uri": "https://applmanserverp1942281469trial.hanatrial.ondemand.com:443/applman/odata.srv/Applications('"+applicationId+"')"
			};
			oModel.create("/Statuss('1')/$links/Applications", oLink);
		},
		
		_uploadPicture: function(applicationId) {
			var oFileUploader = this.getView().byId("pictureUploader");
			oFileUploader.setAdditionalData(applicationId);
			oFileUploader.upload();
		},
		/* =========================================================== */
		/* event handlers general */
		/* =========================================================== */

		/**
		 * Navigates to the ReviewPage
		 * 
		 * @handler "complete" event of the Wizard
		 * @public
		 */
		onWizardCompleted: function() {
			this._oNavContainer.to(this._oReviewPage);
		},
		/**
		 * Opens a MessageBox to let the user confirm 
		 * that she wants to cancel the entry
		 * 
		 * @handler "press" event of the cancel-Button (ReviewPage)
		 * @public
		 */
		onWizardCancel: function() {
			var sText = this.getResourceBundle().getText("DialogCancel");
			this._handleMessageBoxOpen(sText, "warning");
		},
		/**
		 * Calls functions to save the Entry and reset the Wizard
		 * 
		 * @handler "press" event of the submit-Button (ReviewPage)
		 * @public
		 */
		onWizardSubmit: function() {
			this._saveProgress();
			this._handleNavigationToStep(0);
			this._oWizard.discardProgress(this._oWizard.getSteps()[0]);
		},

		/* =========================================================== */
		/* event handlers review page */
		/* =========================================================== */
		/**
		 * Navigates back to the first Step of the Wizard
		 * 
		 * @handler "press" event of the edit-Link in the first section (ReviewPage)
		 * @public
		 */
		editStepOne: function() {
			this._handleNavigationToStep(0);
		},
		
		/**
		 * Navigates back to the second Step of the Wizard
		 * 
		 * @handler "press" event of the edit-Link in the second section (ReviewPage)
		 * @public
		 */
		editStepTwo: function() {
			this._handleNavigationToStep(1);
		},

		/* =========================================================== */
		/* event handlers (step 2) */
		/* =========================================================== */
		/**
		 * Stores the selected Positions (Id and Name) in the dataModel of the View
		 * (for later use)
		 * 
		 * @handler "selectionFinish" event of the MultiComboBox for Positions
		 * @public
		 */
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
		/**
		 * Stores the selected Sources (Id and Name) in the dataModel of the View
		 * (for later use)
		 * 
		 * @handler "selectionFinish" event of the MultiComboBox for Sources
		 * @public
		 */
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
		/**
		 * Changes the Title of the Table to include its amount of items
		 * 
		 * @handler "updateFinished" event of the File-Table
		 * @param oEvent: The updateFinished event
		 * @public
		 */
		onDateienUpdateFinished: function(oEvent) {
//			var totalItems = oEvent.getParameter("total");
//			var oTable = this.getView().byId("tableDateien");
//
//			if (oTable.getBinding("items").isLengthFinal()) { 
//				var sTitle = this.getResourceBundle().getText("wizardDateienTitleWithCount", [totalItems]); 
//				this.getModel("wizardView").setProperty("/dateienTitle", sTitle); 
//			}
		},
		/**
		 * Handles the process of adding a new file
		 * 
		 * @handler "press" event of the add-Button in the File-Table Toolbar
		 * @param oEvent: The press event
		 * @public
		 */
		onAddDatei: function(oEvent) {
//			var oModel = this.getModel("bewerberModel");
//			var aDateien = oModel.getProperty("/Dateien");
//			var oDatei = {
//				"Anzeigetext": "Eine Datei " + aDateien.length,
//				"Dateiname": "Datei/in/einem/Ordner.pdf"
//			};
//
//			aDateien.push(oDatei);
//			oModel.setProperty("/Dateien", aDateien);
		},
		/**
		 * Handles the process of deleting a new file
		 * 
		 * @handler "delete" event of the File-Table
		 * @param oEvent: The delete event
		 * @public
		 */
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

		onUploadComplete: function(oEvent) {

		}

	});

});