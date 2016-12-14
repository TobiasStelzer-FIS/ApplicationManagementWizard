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
			
			this._selectedService = "votes";
			this._currentDialog = {};
			this._dialogs = []; // this will store the instantiated dialogs
			// this._getDialog("DialogStellen");
			
			var oViewModel = new JSONModel({
				"stellenTitle": this.getResourceBundle().getText("wizardStellenTitleWithCount", [0]),
				"quellenTitle": this.getResourceBundle().getText("wizardQuellenTitleWithCount", [0]),
				"dateienTitle": this.getResourceBundle().getText("wizardDateienTitleWithCount", [0]),
				"fotoTitle": this.getResourceBundle().getText("wizardFotoTitleWithCount", [0]),
				"fotoVorhanden": false
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
					"Gender": "m"
//					"Salutation": "",
//					"Lastname": "",
//					"Firstname": "",
//					"Birthdate": new Date(),
//					"Picture": "",
//					"Street": "",
//					"Zipcode": "",
//					"City": "",
//					"Email": "",
//					"Phone": "",
//					"Mobile": ""
				},
				"Positions": [],
				"Sources": []
			});
			
			this.setModel(oDataModel, "dataModel");
		},
		
		/* =========================================================== */
		/* internal methods */
		/* =========================================================== */

		_getDialog: function(sFragmentName) {
			var oDialog = this._dialogs[sFragmentName];

			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(this.getView().getId(), "de.fis.applicationwizard.view.fragment." + sFragmentName, this);
				this.getView().addDependent(oDialog);
				this._dialogs[sFragmentName] = oDialog;
			}
			return oDialog;
		},

		_openDialog: function(sFragmentName) {
			this._currentDialog = this._getDialog(sFragmentName);
			this._currentDialog.open();
			return this._currentDialog;
		},

		_closeDialog: function() {
			this._currentDialog.close();
		},

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
			this._saveApplicant(oModel);
		},
		
		_saveApplicant: function(oModel) {
			// Create Applicant + receive applicantId
			var oApplicant = this.getModel("dataModel").getProperty("/Applicant");
			oModel.create("/Applicants", oApplicant, {
				success: function(oData) {
					this._saveApplication(oData.ApplicantId, oModel);
					console.log(oData);
				}.bind(this)
			});
		},
		
		_saveApplication: function(applicantId, oModel) {
			// Create Application with applicantId + receive applicationId
			this.getModel("dataModel").setProperty("/Application/ApplicantId", applicantId);
			var oApplication = this.getModel("dataModel").getProperty("/Application");
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
			// Create all LinkPositionApplication with applicationId
			for (var i = 0; i < aPositions.length; i++) {
				var oLinkPositionApplication = {
					"PositionId": aPositions[i].PositionId,
					"ApplicationId": applicationId
				};
				oModel.create("/LinkPositionApplications", oLinkPositionApplication, {
					success: function(oData) {
						console.log(oData);
					}.bind(this)
				});
			}
		},
		
		_saveSources: function(applicationId, oModel) {
			var aSources = this.getModel("dataModel").getProperty("/Sources");
			// Create all LinkSourceApplication with applicationId
			for (var i = 0; i < aSources.length; i++) {
				var oLinkSourceApplication = {
					"SourceId": aSources[i].SourceId,
					"ApplicationId": applicationId
				};
				oModel.create("/LinkSourceApplications", oLinkSourceApplication, {
					success: function(oData) {
						console.log(oData);
					}.bind(this)
				});
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
			var sText = this.getResourceBundle().getText("wizardDialogCancel");
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

		onStellenUpdateFinished: function(oEvent) {
			var totalItems = oEvent.getParameter("total");
			var oTable = this.getView().byId("tableStellen");

			if (oTable.getBinding("items").isLengthFinal()) { // Wenn die
																// Länge der
																// geladenen
																// Items "final"
																// ist,
				var sTitle = this.getResourceBundle().getText("wizardStellenTitleWithCount", [totalItems]); // aktualisiere
																											// die
																											// Itemanzahl
				this.getModel("wizardView").setProperty("/stellenTitle", sTitle); // im
																					// Titel
																					// der
																					// Page
			}
		},

		onQuellenUpdateFinished: function(oEvent) {
			var totalItems = oEvent.getParameter("total");
			var oTable = this.getView().byId("tableQuellen");

			if (oTable.getBinding("items").isLengthFinal()) { // Wenn die
																// Länge der
																// geladenen
																// Items "final"
																// ist,
				var sTitle = this.getResourceBundle().getText("wizardQuellenTitleWithCount", [totalItems]); // aktualisiere
																											// die
																											// Itemanzahl
				this.getModel("wizardView").setProperty("/quellenTitle", sTitle); // im
																					// Titel
																					// der
																					// Page
			}
		},

		onAddStelle: function(oEvent) {
			this._openDialog("DialogStellen");
			/*
			 * var oModel = this.getModel("bewerberModel"); var aStellen =
			 * oModel.getProperty("/Stellen"); var oStelle = { "Bezeichnung":
			 * "Eine Stellenbezeichnung " + aStellen.length };
			 * 
			 * aStellen.push(oStelle); oModel.setProperty("/Stellen", aStellen);
			 */
		},

		onAddQuelle: function(oEvent) {
			var oModel = this.getModel("bewerberModel");
			var aQuellen = oModel.getProperty("/Quellen");
			var oQuelle = {
				"Bezeichnung": "Eine Quellenbezeichnung" + aQuellen.length
			};

			aQuellen.push(oQuelle);
			oModel.setProperty("/Quellen", aQuellen);
		},

		/**
		 * Determines the search query string and creates a corresponding filter
		 * 
		 * @handler "search" event of SearchField
		 * @handler "liveChange" event of SearchField
		 * @param oEvent:
		 *            The search or liveChange event
		 * @public
		 */
		onStellenSearch: function(oEvent) {
			var aFilters = [];
			var sQuery = oEvent.getParameter("newValue"); // Parameter
															// "newValue"
															// enthält den
															// Suchstring beim
															// "liveChange"-Event
			if (sQuery == null) {
				sQuery = oEvent.getParameter("query"); // Falls es den nicht
														// gibt, hole den vom
														// "search"-Event
			}

			if (sQuery !== "") { // Wenn etwas im SearchField steht,
				aFilters.push( // dann erstelle Filter für Bezeichnung
					new Filter("Bezeichnung", FilterOperator.Contains, sQuery)
				);
			}

			var oList = this.getView().byId("listSelectStellen");
			oList.getBinding("items").filter(aFilters, "Application");
		},

		onDeleteStelle: function(oEvent) {
			/*
			var oModel = this.getModel("bewerberModel");
			var oItem = oEvent.getParameter("listItem");
			var oBindingContext = oItem.getBindingContext("bewerberModel");
			var sPath = oBindingContext.getPath();
			var nIndex = parseInt(sPath.substring(sPath.length - 1, sPath.length));
			var aStellen = oModel.getProperty("/Stellen");

			aStellen.splice(nIndex, 1);
			oModel.setProperty("/Stellen", aStellen);
			*/
		},

		onDeleteQuelle: function(oEvent) {
			/*
			var oModel = this.getModel("bewerberModel");
			var oItem = oEvent.getParameter("listItem");
			var oBindingContext = oItem.getBindingContext("bewerberModel");
			var sPath = oBindingContext.getPath();
			var nIndex = parseInt(sPath.substring(sPath.length - 1, sPath.length));
			var aQuellen = oModel.getProperty("/Quellen");

			aQuellen.splice(nIndex, 1);
			oModel.setProperty("/Quellen", aQuellen);
			*/
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

		onFotoUpdateFinished: function(oEvent) {
			var totalItems = oEvent.getParameter("total");
			var oTable = this.getView().byId("tableFoto");

			if (oTable.getBinding("items").isLengthFinal()) { // Wenn die
																// Länge der
																// geladenen
																// Items "final"
																// ist,
				var sTitle = this.getResourceBundle().getText("wizardFotoTitleWithCount", [totalItems]); // aktualisiere
																											// die
																											// Itemanzahl
				this.getModel("wizardView").setProperty("/fotoTitle", sTitle); // im
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

		onAddFoto: function(oEvent) {
			var oModel = this.getModel("bewerberModel");
			if (oModel.getProperty("/Fotos").length > 0) {
				sap.m.MessageToast.show("Es kann nur ein Foto hochgeladen werden.");
				return;
			}
			var aFotos = [];
			var oFoto = {
				"Dateiname": "max_mustermann.png"
			};

			aFotos.push(oFoto);
			oModel.setProperty("/Fotos", aFotos);
			this.getModel("wizardView").setProperty("/fotoVorhanden", true);
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