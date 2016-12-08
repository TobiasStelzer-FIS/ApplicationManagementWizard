sap.ui.define(function() {
	"use strict";

	return {

		formatVisibleIfLast: function(aItems, nCurrentId) {
			if (aItems[aItems.length - 1].Id === nCurrentId) {
				return true;
			}
			return false;
		},

		formatLabelStellen: function(aItems, nCurrentId) {
			if (aItems[0].Id === nCurrentId) {
				return "Stellen";
			}
			return " ";
		},

		formatLabelQuellen: function(aItems, nCurrentId) {
			if (aItems[0].Id === nCurrentId) {
				return "Quellen";
			}
			return " ";
		}

	};
});