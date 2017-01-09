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
			this._currentDialog = null;

			this._oNavContainer.addPage(this._oReviewPage);

			var oViewModel = new JSONModel({
				"documentsTitle": this.getResourceBundle().getText("DocumentsTitleWithCount", [0]),
				"DocumentTemp": null
			});

			this.setModel(oViewModel, "viewModel");

			this._initialize();
		},

		_onMetadataLoaded: function(oEvent) {
			var oModel = this.getModel("applmanModel");
		},

		/**
		 * Resets the viewDataModel of the View
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
					"Salutation": "",
					"Lastname": "",
					"Firstname": "",
					//					"Birthdate": new Date(),
					"Street": "",
					"Zipcode": "",
					"City": "",
					"Email": "",
					"Phone": "",
					"Mobile": "",
					"Gender": "m"
				},
				"Positions": [],
				"Sources": [],
				"Documents": []
			});

			this.setModel(oDataModel, "viewDataModel");
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
					switch (oAction) {
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

		_openFileChooserDialog: function() {
			var oDialog = this._currentDialog;

			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(this.getView().getId(), "de.fis.applicationwizard.view.fragment.FileChooserDialog", this);
				this.getView().addDependent(oDialog);
				this._currentDialog = oDialog;
			}
			this._currentDialog.open();
			return this._currentDialog;
		},

		_closeDialog: function() {
			this._currentDialog.close();
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
			var oDataModel = this.getModel("viewDataModel");
			var oApplication = oDataModel.getProperty("/Application");
			oApplication.ApplicantDetails = oDataModel.getProperty("/Applicant");
			oModel.create("/Applications", oApplication, {
				
				success: function(oData) {
					console.log("all SUCCESS");
					this._linkPositions(oData.ApplicationId, oModel);
					this._linkSources(oData.ApplicationId, oModel);
					this._linkStatus(oData.ApplicationId, oModel);
					this._uploadPicture(oData.ApplicationId);
					this._initialize();
				}.bind(this),
				error: function() {
					console.log("all ERROR");
				}
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
			var aPositions = this.getModel("viewDataModel").getProperty("/Positions");
			// Link the Application with all Positions
			for (var i = 0; i < aPositions.length; i++) {
				// Application -> Position
				var oLink = {
					"uri": "https://applmanserverp1942281469trial.hanatrial.ondemand.com:443/applman/odata.srv/Positions('" + aPositions[i].PositionId +
						"')"
				};
				oModel.create("/Applications('" + applicationId + "')/$links/Positions", oLink);
				// Position -> Application
				oLink = {
					"uri": "https://applmanserverp1942281469trial.hanatrial.ondemand.com:443/applman/odata.srv/Applications('" + applicationId +
						"')"
				};
				oModel.create("/Positions('" + aPositions[i].PositionId + "')/$links/Applications", oLink);
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
			var aSources = this.getModel("viewDataModel").getProperty("/Sources");
			// Link the Application with all Sources
			for (var i = 0; i < aSources.length; i++) {
				// Application -> Source
				var oLink = {
					"uri": "https://applmanserverp1942281469trial.hanatrial.ondemand.com:443/applman/odata.srv/Sources('" + aSources[i].SourceId +
						"')"
				};
				oModel.create("/Applications('" + applicationId + "')/$links/Sources", oLink);
				// Source -> Application
				oLink = {
					"uri": "https://applmanserverp1942281469trial.hanatrial.ondemand.com:443/applman/odata.srv/Applications('" + applicationId +
						"')"
				};
				oModel.create("/Sources('" + aSources[i].SourceId + "')/$links/Applications", oLink);
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
				"uri": "https://applmanserverp1942281469trial.hanatrial.ondemand.com:443/applman/odata.srv/Applications('" + applicationId + "')"
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
		/**
		 * The actual validation can't be done here because the
		 * viewDataModel is not updated with the new Input-Value yet.
		 * So instead a 'propertyChange'-Event is attached to the viewDataModel
		 * and the actual validation is done when that event fires (in _validateStep1)
		 * 
		 * @handler "activate" event of the wizardStep1
		 * @handler "liveChange" event of (mandatory) Inputs
		 * @public
		 */
		onValidateStep1: function() {
			var oViewDataModel = this.getModel("viewDataModel");
			oViewDataModel.attachEventOnce("propertyChange", this._validateStep1, this);
		},
		/**
		 * Validates the Input of the mandatory fields in wizardStep1
		 * and enables/disables the continue-Button depending on the result
		 * 
		 * @private
		 */
		_validateStep1: function() {
			var oViewModel = this.getModel("viewModel");
			var oViewDataModel = this.getModel("viewDataModel");
			
			var oApplicant = oViewDataModel.getProperty("/Applicant");
			var successState = "Success";
			
//			oApplicant.Lastname.length<1 ? oViewModel.setProperty("/valueStateLastname", "Error") : oViewModel.setProperty("/valueStateLastname", successState);
//			oApplicant.Firstname.length<1 ? oViewModel.setProperty("/valueStateFirstname", "Error") : oViewModel.setProperty("/valueStateFirstname", successState);
//			oApplicant.Street.length<1 ? oViewModel.setProperty("/valueStateStreet", "Error") : oViewModel.setProperty("/valueStateStreet", successState);
//			oApplicant.Zipcode.length<1 ? oViewModel.setProperty("/valueStateZipcode", "Error") : oViewModel.setProperty("/valueStateZipcode", successState);
//			oApplicant.City.length<1 ? oViewModel.setProperty("/valueStateCity", "Error") : oViewModel.setProperty("/valueStateCity", successState);

			if (oApplicant.Gender.length < 1 ||
				oApplicant.Lastname.length < 1 ||
				oApplicant.Firstname.length < 1 ||
				!oApplicant.Birthdate ||
				oApplicant.Street.length < 1 ||
				oApplicant.Zipcode.length < 1 ||
				oApplicant.City.length < 1) {
				this._oWizard.invalidateStep(this.getView().byId("wizardStep1"));
			} else {
				this._oWizard.validateStep(this.getView().byId("wizardStep1"));
			}
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
		 * Stores the selected Positions (Id and Name) in the viewDataModel of the View
		 * (for later use)
		 * 
		 * @handler "selectionFinish" event of the MultiComboBox for Positions
		 * @public
		 */
		onPositionsFinished: function(oEvent) {
			var aItems = oEvent.getParameter("selectedItems");
			var aPositions = this.getModel("viewDataModel").getProperty("/Positions");
			aPositions = [];

			for (var i = 0; i < aItems.length; i++) {
				aPositions.push({
					"PositionId": aItems[i].getKey(),
					"Name": aItems[i].getText()
				});
			}
			this.getModel("viewDataModel").setProperty("/Positions", aPositions);
		},
		/**
		 * Stores the selected Sources (Id and Name) in the viewDataModel of the View
		 * (for later use)
		 * 
		 * @handler "selectionFinish" event of the MultiComboBox for Sources
		 * @public
		 */
		onSourcesFinished: function(oEvent) {
			var aItems = oEvent.getParameter("selectedItems");
			var aSources = this.getModel("viewDataModel").getProperty("/Sources");
			aSources = [];

			for (var i = 0; i < aItems.length; i++) {
				aSources.push({
					"SourceId": aItems[i].getKey(),
					"Name": aItems[i].getText()
				});
			}
			this.getModel("viewDataModel").setProperty("/Sources", aSources);
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
		onDocumentsUpdateFinished: function(oEvent) {
			var totalItems = oEvent.getParameter("total");
			var oTable = this.getView().byId("tableDocuments");

			if (oTable.getBinding("items").isLengthFinal()) {
				var sTitle = this.getResourceBundle().getText("DocumentsTitleWithCount", [totalItems]);
				this.getModel("viewModel").setProperty("/documentsTitle", sTitle);
			}
		},

		/**
		 * Handles the process of adding a new file
		 * 
		 * @handler "press" event of the add-Button in the File-Table Toolbar
		 * @param oEvent: The press event
		 * @public
		 */
		onAddDocument: function(oEvent) {
			var oViewModel = this.getModel("viewModel");

			oViewModel.setProperty("/DocumentTemp", {});

			var oDialog = this._openFileChooserDialog();
			oDialog.bindElement({
				path: "/DocumentTemp",
				model: "viewModel"
			});
		},

		/**
		 * Handles the process of deleting a new file
		 * 
		 * @handler "delete" event of the File-Table
		 * @param oEvent: The delete event
		 * @public
		 */
		onDeleteDocument: function(oEvent) {
			var oViewDataModel = this.getModel("viewDataModel");
			var oItem = oEvent.getParameter("listItem");
			var oBindingContext = oItem.getBindingContext("viewDataModel");
			var sPath = oBindingContext.getPath();
			var nIndex = parseInt(sPath.substring(sPath.length - 1, sPath.length));
			var aDocuments = oViewDataModel.getProperty("/Documents");

			aDocuments.splice(nIndex, 1);
			oViewDataModel.setProperty("/Documents", aDocuments);
		},

		onFileSave: function(oEvent) {
			var oViewDataModel = this.getModel("viewDataModel");
			var oViewModel = this.getModel("viewModel");

			var oDocument = oViewModel.getProperty("/DocumentTemp");
			var aDocuments = oViewDataModel.getProperty("/Documents");
			aDocuments.push(oDocument);
			oViewDataModel.setProperty("/Documents", aDocuments);

			this._closeDialog();
		},

		onFileCancel: function(oEvent) {
			this._closeDialog();
		},

		onUploadComplete: function(oEvent) {

		}

	});

});