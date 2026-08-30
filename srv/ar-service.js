const cds = require('@sap/cds');
const {
  AGING_BUCKETS,
  addCalculatedFields,
  validatePayment
} = require('./ar-calculations');

async function enrichInvoices(invoices) {
  const payments = await SELECT.from('ar.Payments');
  addCalculatedFields(invoices, payments);
}

module.exports = function () {
  const { Invoices } = this.entities;

  this.after('READ', Invoices, async invoices => {
    if (!invoices) return;
    await enrichInvoices(Array.isArray(invoices) ? invoices : [invoices]);
  });

  this.on('getARSummary', async () => {
    const invoices = await SELECT.from('ar.Invoices');
    await enrichInvoices(invoices);

    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let totalReceivables = 0;
    let totalOverdue = 0;
    let dueThisMonth = 0;
    const overdueCustomerIds = new Set();

    for (const invoice of invoices) {
      if (invoice.outstanding <= 0) continue;

      totalReceivables += invoice.outstanding;
      if (invoice.agingBucket !== 'Not Due') {
        totalOverdue += invoice.outstanding;
        overdueCustomerIds.add(invoice.customer_ID);
      }

      const dueDate = new Date(invoice.dueDate);
      if (dueDate >= today && dueDate <= endOfMonth) {
        dueThisMonth += invoice.outstanding;
      }
    }

    return {
      totalReceivables,
      totalOverdue,
      dueThisMonth,
      overdueCustomers: overdueCustomerIds.size
    };
  });

  this.on('getAgingSummary', async () => {
    const invoices = await SELECT.from('ar.Invoices');
    await enrichInvoices(invoices);

    return AGING_BUCKETS.map(bucket => ({
      bucket,
      amount: invoices
        .filter(invoice => invoice.outstanding > 0 && invoice.agingBucket === bucket)
        .reduce((total, invoice) => total + invoice.outstanding, 0)
    }));
  });

  this.on('addPayment', async req => {
    const invoice = await SELECT.one.from('ar.Invoices').where({ ID: req.data.invoiceId });
    if (!invoice) return req.reject(404, 'Invoice not found.');

    await enrichInvoices([invoice]);

    let amount;
    try {
      amount = validatePayment(req.data.amount, invoice.outstanding);
    } catch (error) {
      return req.reject(400, error.message);
    }

    const payment = {
      ID: cds.utils.uuid(),
      invoice_ID: invoice.ID,
      paymentDate: req.data.paymentDate || new Date().toISOString().slice(0, 10),
      amount
    };

    await INSERT.into('ar.Payments').entries(payment);
    return payment;
  });
};
