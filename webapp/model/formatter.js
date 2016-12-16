sap.ui.define(function() {
	"use strict";

	return {

		genderKeyToName: function(key) {
			var oBundle = this.getModel("i18n").getResourceBundle();
			switch(key) {
			case "w":
				return oBundle.getText("Female");
			case "m":
				return oBundle.getText("Male");
			}
		},
		
		formatQuellenVisibleIfLast: function(aItems, nCurrentId) {
			if (aItems[aItems.length - 1].SourceId === nCurrentId) {
				return true;
			}
			return false;
		},

		formatLabelStellen: function(aItems, nCurrentId) {
			var oBundle = this.getModel("i18n").getResourceBundle();
			if (aItems[0].PositionId === nCurrentId) {
				return oBundle.getText("Positions");
			}
			return "";
		},

		formatLabelQuellen: function(aItems, nCurrentId) {
			var oBundle = this.getModel("i18n").getResourceBundle();
			if (aItems[0].SourceId === nCurrentId) {
				return oBundle.getText("Sources");
			}
			return "";
		}

	};
});