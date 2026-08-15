sap.ui.define([
  "sap/m/App",
  "sap/m/NavContainer",
  "sap/ui/core/mvc/XMLView"
], function (App, NavContainer, XMLView) {
  "use strict";

  var oNavContainer = new NavContainer("appNavContainer");
  var oApp = new App("app", {
    pages: [oNavContainer]
  });

  function navTo(viewId, viewName) {
    var oExisting = sap.ui.getCore().byId(viewId);
    if (oExisting) {
      oNavContainer.to(viewId);
      return;
    }
    XMLView.create({
      id: viewId,
      viewName: "ar.app.view." + viewName
    }).then(function (oView) {
      oNavContainer.addPage(oView);
      oNavContainer.to(viewId);
    });
  }

  function navToCustomer(customerId) {
    var oExisting = sap.ui.getCore().byId("customerView");
    if (oExisting) {
      oNavContainer.removePage(oExisting);
      oExisting.destroy();
    }
    XMLView.create({
      id: "customerView",
      viewName: "ar.app.view.CustomerDetail"
    }).then(function (oView) {
      oNavContainer.addPage(oView);
      oNavContainer.to("customerView");
      oView.getController().loadCustomer(customerId);
    });
  }

  // exposed so view controllers can trigger navigation without a router
  window.appNavigation = {
    showDashboard: function () { navTo("dashboardView", "Dashboard"); },
    showInvoices: function () { navTo("invoicesView", "Invoices"); },
    showCustomer: navToCustomer
  };

  navTo("dashboardView", "Dashboard");
  oApp.placeAt("content");
});
