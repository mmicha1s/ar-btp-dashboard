sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  function bucketState(bucket) {
    if (bucket === "Not Due" || bucket === "Paid") return "Success";
    if (bucket === "1-30" || bucket === "31-60") return "Warning";
    return "Error";
  }

  return Controller.extend("ar.app.controller.Invoices", {

    onInit: function () {
      this.getView().setModel(new JSONModel({ rows: [] }), "invoices");
      this._allRows = [];
      this._loadData();
    },

    _loadData: async function () {
      var response = await fetch("/odata/v4/ar/Invoices?$expand=customer($select=name)");
      var data = await response.json();

      var rows = [];
      for (var i = 0; i < data.value.length; i++) {
        var invoice = data.value[i];
        rows.push({
          customerId: invoice.customer_ID,
          customerName: invoice.customer.name,
          number: invoice.number,
          dueDate: invoice.dueDate,
          amountText: Number(invoice.amount).toFixed(2) + " " + invoice.currency,
          outstandingText: Number(invoice.outstanding).toFixed(2) + " " + invoice.currency,
          daysOverdue: invoice.daysOverdue === null ? "–" : invoice.daysOverdue,
          agingBucket: invoice.agingBucket,
          bucketState: bucketState(invoice.agingBucket)
        });
      }

      this._allRows = rows;
      this._applyFilters();
    },

    onFilterChange: function () {
      this._applyFilters();
    },

    _applyFilters: function () {
      var searchTerm = this.byId("searchField").getValue().trim().toLowerCase();
      var bucket = this.byId("bucketSelect").getSelectedKey();

      var filtered = [];
      for (var i = 0; i < this._allRows.length; i++) {
        var row = this._allRows[i];
        if (bucket && row.agingBucket !== bucket) continue;
        if (searchTerm) {
          var haystack = (row.number + " " + row.customerName).toLowerCase();
          if (haystack.indexOf(searchTerm) === -1) continue;
        }
        filtered.push(row);
      }

      this.getView().getModel("invoices").setProperty("/rows", filtered);
    },

    onInvoicePress: function (oEvent) {
      var oContext = oEvent.getSource().getBindingContext("invoices");
      var customerId = oContext.getProperty("customerId");
      window.appNavigation.showCustomer(customerId);
    },

    onBack: function () {
      window.appNavigation.showDashboard();
    }
  });
});
