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

  return Controller.extend("ar.app.controller.CustomerDetail", {

    onInit: function () {
      this.getView().setModel(new JSONModel({}), "customer");
    },

    loadCustomer: async function (customerId) {
      var customerResponse = await fetch("/odata/v4/ar/Customers(" + customerId + ")");
      var customer = await customerResponse.json();

      var invoicesResponse = await fetch("/odata/v4/ar/Invoices?$filter=customer_ID eq " + customerId);
      var invoices = await invoicesResponse.json();

      var outstanding = 0;
      var overdue = 0;
      var rows = [];

      for (var i = 0; i < invoices.value.length; i++) {
        var invoice = invoices.value[i];
        outstanding += Number(invoice.outstanding);
        if (invoice.outstanding > 0 && invoice.agingBucket !== "Not Due") {
          overdue += Number(invoice.outstanding);
        }

        var statusText;
        if (invoice.agingBucket === "Paid") {
          statusText = "Paid";
        } else if (invoice.agingBucket === "Not Due") {
          statusText = "Not due";
        } else {
          statusText = invoice.daysOverdue + " days overdue";
        }

        rows.push({
          number: invoice.number,
          dueDate: invoice.dueDate,
          amountText: Number(invoice.amount).toFixed(2) + " " + invoice.currency,
          outstandingText: Number(invoice.outstanding).toFixed(2) + " " + invoice.currency,
          statusText: statusText,
          bucketState: bucketState(invoice.agingBucket)
        });
      }

      this.getView().getModel("customer").setData({
        name: customer.name,
        country: customer.country,
        outstanding: outstanding.toFixed(2) + " EUR",
        overdue: overdue.toFixed(2) + " EUR",
        invoices: rows
      });
    },

    onBack: function () {
      window.appNavigation.showDashboard();
    }
  });
});
