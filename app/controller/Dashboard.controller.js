sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  function agingState(bucket) {
    if (bucket === "Not Due") return "Success";
    if (bucket === "1-30" || bucket === "31-60") return "Warning";
    return "Error";
  }

  return Controller.extend("ar.app.controller.Dashboard", {

    onInit: function () {
      this.getView().setModel(new JSONModel({}), "dashboard");
      this._loadData();
    },

    _loadData: async function () {
      var summaryResponse = await fetch("/odata/v4/ar/getARSummary()");
      var summary = await summaryResponse.json();

      var agingResponse = await fetch("/odata/v4/ar/getAgingSummary()");
      var aging = await agingResponse.json();

      var invoicesResponse = await fetch("/odata/v4/ar/Invoices?$expand=customer($select=name)");
      var invoices = await invoicesResponse.json();

      // build the aging bars
      var agingList = [];
      for (var i = 0; i < aging.value.length; i++) {
        var bucket = aging.value[i];
        var percent = 0;
        if (summary.totalReceivables > 0) {
          percent = Math.round((bucket.amount / summary.totalReceivables) * 100);
        }
        agingList.push({
          bucket: bucket.bucket,
          amount: bucket.amount.toFixed(2) + " EUR",
          state: agingState(bucket.bucket),
          percent: percent
        });
      }

      // add up overdue amounts per customer
      var overdueByCustomer = {};
      for (var j = 0; j < invoices.value.length; j++) {
        var invoice = invoices.value[j];
        if (invoice.outstanding > 0 && invoice.agingBucket !== "Not Due") {
          var custId = invoice.customer_ID;
          if (!overdueByCustomer[custId]) {
            overdueByCustomer[custId] = { name: invoice.customer.name, amount: 0 };
          }
          overdueByCustomer[custId].amount += invoice.outstanding;
        }
      }

      // turn the totals into a list, sort highest first, keep top 5
      var topOverdue = [];
      for (var id in overdueByCustomer) {
        topOverdue.push({
          customerId: id,
          name: overdueByCustomer[id].name,
          amount: overdueByCustomer[id].amount
        });
      }
      topOverdue.sort(function (a, b) { return b.amount - a.amount; });
      topOverdue = topOverdue.slice(0, 5);
      for (var k = 0; k < topOverdue.length; k++) {
        topOverdue[k].amount = topOverdue[k].amount.toFixed(2) + " EUR";
      }

      this.getView().getModel("dashboard").setData({
        totalReceivables: summary.totalReceivables.toFixed(2) + " EUR",
        totalOverdue: summary.totalOverdue.toFixed(2) + " EUR",
        dueThisMonth: summary.dueThisMonth.toFixed(2) + " EUR",
        overdueCustomers: summary.overdueCustomers,
        aging: agingList,
        topOverdue: topOverdue
      });
    },

    onShowInvoices: function () {
      window.appNavigation.showInvoices();
    },

    onCustomerPress: function (oEvent) {
      var oContext = oEvent.getSource().getBindingContext("dashboard");
      var customerId = oContext.getProperty("customerId");
      window.appNavigation.showCustomer(customerId);
    }
  });
});
