const AGING_BUCKETS = ['Not Due', '1-30', '31-60', '61-90', '90+'];

function getAgingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'Not Due';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

function getDaysOverdue(dueDate) {
  const today = new Date();
  const todayMidnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  const due = new Date(dueDate);
  const dueMidnight = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());

  const oneDay = 1000 * 60 * 60 * 24;
  const diff = Math.round((todayMidnight - dueMidnight) / oneDay);
  return diff > 0 ? diff : 0;
}

// Adds outstanding / daysOverdue / agingBucket to each invoice, in place.
async function addCalculatedFields(invoices) {
  const payments = await SELECT.from('ar.Payments');
  const paidByInvoice = {};

  for (const payment of payments) {
    const invoiceId = payment.invoice_ID;
    if (!paidByInvoice[invoiceId]) {
      paidByInvoice[invoiceId] = 0;
    }
    paidByInvoice[invoiceId] += Number(payment.amount);
  }

  for (const invoice of invoices) {
    const paid = paidByInvoice[invoice.ID] || 0;
    const outstanding = Math.max(0, Number(invoice.amount) - paid);

    invoice.outstanding = outstanding;
    if (outstanding === 0) {
      invoice.daysOverdue = null;
      invoice.agingBucket = 'Paid';
      continue;
    }

    invoice.daysOverdue = getDaysOverdue(invoice.dueDate);
    invoice.agingBucket = getAgingBucket(invoice.daysOverdue);
  }
}

module.exports = function () {
  const { Invoices } = this.entities;

  // Every time invoices are read via OData, enrich them with the calculated fields.
  this.after('READ', Invoices, async (invoices) => {
    if (!invoices) return;
    const list = Array.isArray(invoices) ? invoices : [invoices];
    await addCalculatedFields(list);
  });

  this.on('getARSummary', async () => {
    const invoices = await SELECT.from('ar.Invoices');
    await addCalculatedFields(invoices);

    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let totalReceivables = 0;
    let totalOverdue = 0;
    let dueThisMonth = 0;
    const overdueCustomerIds = [];

    for (const invoice of invoices) {
      if (invoice.outstanding <= 0) continue;

      totalReceivables += invoice.outstanding;

      if (invoice.agingBucket !== 'Not Due') {
        totalOverdue += invoice.outstanding;
        if (!overdueCustomerIds.includes(invoice.customer_ID)) {
          overdueCustomerIds.push(invoice.customer_ID);
        }
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
      overdueCustomers: overdueCustomerIds.length
    };
  });

  this.on('getAgingSummary', async () => {
    const invoices = await SELECT.from('ar.Invoices');
    await addCalculatedFields(invoices);

    const result = [];
    for (const bucket of AGING_BUCKETS) {
      let amount = 0;
      for (const invoice of invoices) {
        if (invoice.outstanding > 0 && invoice.agingBucket === bucket) {
          amount += invoice.outstanding;
        }
      }
      result.push({ bucket, amount });
    }
    return result;
  });
};
