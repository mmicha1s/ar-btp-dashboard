sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/Button",
  "sap/m/DatePicker",
  "sap/m/Dialog",
  "sap/m/Input",
  "sap/m/Label",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, JSONModel, Button, DatePicker, Dialog, Input, Label, MessageBox, MessageToast) {
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
      this._customerId = customerId;
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
          id: invoice.ID,
          number: invoice.number,
          dueDate: invoice.dueDate,
          amountText: Number(invoice.amount).toFixed(2) + " " + invoice.currency,
          outstandingText: Number(invoice.outstanding).toFixed(2) + " " + invoice.currency,
          statusText: statusText,
          bucketState: bucketState(invoice.agingBucket),
          outstanding: Number(invoice.outstanding),
          canAddPayment: Number(invoice.outstanding) > 0
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

    onAddPayment: function (event) {
      var invoice = event.getSource().getBindingContext("customer").getObject();
      var controller = this;
      var amountInput = new Input({
        type: "Number",
        value: invoice.outstanding.toFixed(2)
      });
      var dateInput = new DatePicker({
        value: new Date().toISOString().slice(0, 10),
        valueFormat: "yyyy-MM-dd",
        displayFormat: "yyyy-MM-dd"
      });
      var dialog = new Dialog({
        title: "Add payment for " + invoice.number,
        contentWidth: "24rem",
        content: [
          new Label({ text: "Payment date" }),
          dateInput,
          new Label({ text: "Amount in EUR" }),
          amountInput
        ],
        beginButton: new Button({
          text: "Save",
          type: "Emphasized",
          press: async function () {
            var amount = Number(amountInput.getValue());
            if (!Number.isFinite(amount) || amount <= 0) {
              MessageBox.error("Enter a payment amount greater than zero.");
              return;
            }

            var response = await fetch("/odata/v4/ar/addPayment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoiceId: invoice.id,
                paymentDate: dateInput.getValue(),
                amount: amount
              })
            });

            if (!response.ok) {
              var result = await response.json();
              MessageBox.error(result.error && result.error.message
                ? result.error.message
                : "Payment could not be saved.");
              return;
            }

            dialog.close();
            MessageToast.show("Payment saved.");
            await controller.loadCustomer(controller._customerId);
          }
        }),
        endButton: new Button({
          text: "Cancel",
          press: function () {
            dialog.close();
          }
        }),
        afterClose: function () {
          dialog.destroy();
        }
      });

      dialog.open();
    },

    onBack: function () {
      window.appNavigation.showDashboard();
    }
  });
});
