const AGING_BUCKETS = ['Not Due', '1-30', '31-60', '61-90', '90+'];

function getAgingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'Not Due';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

function getDaysOverdue(dueDate, today = new Date()) {
  const todayMidnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(`${dueDate}T00:00:00Z`);
  const dueMidnight = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const oneDay = 1000 * 60 * 60 * 24;

  return Math.max(0, Math.round((todayMidnight - dueMidnight) / oneDay));
}

function addCalculatedFields(invoices, payments, today = new Date()) {
  const paidByInvoice = new Map();

  for (const payment of payments) {
    const paid = paidByInvoice.get(payment.invoice_ID) || 0;
    paidByInvoice.set(payment.invoice_ID, paid + Number(payment.amount));
  }

  for (const invoice of invoices) {
    const outstanding = Math.max(
      0,
      Number(invoice.amount) - (paidByInvoice.get(invoice.ID) || 0)
    );

    invoice.outstanding = outstanding;
    if (outstanding === 0) {
      invoice.daysOverdue = null;
      invoice.agingBucket = 'Paid';
      continue;
    }

    invoice.daysOverdue = getDaysOverdue(invoice.dueDate, today);
    invoice.agingBucket = getAgingBucket(invoice.daysOverdue);
  }
}

function validatePayment(amount, outstanding) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  if (value > outstanding) {
    throw new Error('Payment amount cannot exceed the outstanding balance.');
  }

  return value;
}

module.exports = {
  AGING_BUCKETS,
  addCalculatedFields,
  validatePayment
};
