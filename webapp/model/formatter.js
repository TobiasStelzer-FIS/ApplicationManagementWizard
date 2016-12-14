sap.ui.define(function() {
	"use strict";

	return {

		formatQuellenVisibleIfLast: function(aItems, nCurrentId) {
			if (aItems[aItems.length - 1].SourceId === nCurrentId) {
				return true;
			}
			return false;
		},

		formatLabelStellen: function(aItems, nCurrentId) {
			if (aItems[0].PositionId === nCurrentId) {
				return "Stellen";
			}
			return " ";
		},

		formatLabelQuellen: function(aItems, nCurrentId) {
			if (aItems[0].SourceId === nCurrentId) {
				return "Quellen";
			}
			return " ";
		}

	};
});