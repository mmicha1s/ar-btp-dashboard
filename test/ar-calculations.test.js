const assert = require('node:assert/strict');
const test = require('node:test');
const {
  addCalculatedFields,
  validatePayment
} = require('../srv/ar-calculations');

const TODAY = new Date('2026-08-15T12:00:00Z');

function invoice(id, dueDate, amount = 1000) {
  return { ID: id, dueDate, amount };
}

test('assigns every open invoice to the correct aging category', () => {
  const invoices = [
    invoice('not-due', '2026-08-20'),
    invoice('one-to-thirty', '2026-08-14'),
    invoice('thirty-one-to-sixty', '2026-07-15'),
    invoice('sixty-one-to-ninety', '2026-06-15'),
    invoice('ninety-plus', '2026-05-16')
  ];

  addCalculatedFields(invoices, [], TODAY);

  assert.deepEqual(
    invoices.map(item => [item.daysOverdue, item.agingBucket]),
    [
      [0, 'Not Due'],
      [1, '1-30'],
      [31, '31-60'],
      [61, '61-90'],
      [91, '90+']
    ]
  );
});

test('calculates the remaining amount after a partial payment', () => {
  const invoices = [invoice('partial', '2026-08-01')];
  const payments = [{ invoice_ID: 'partial', amount: 250 }];

  addCalculatedFields(invoices, payments, TODAY);

  assert.equal(invoices[0].outstanding, 750);
  assert.equal(invoices[0].agingBucket, '1-30');
});

test('marks a fully paid invoice as Paid without overdue days', () => {
  const invoices = [invoice('paid', '2026-05-01')];
  const payments = [{ invoice_ID: 'paid', amount: 1000 }];

  addCalculatedFields(invoices, payments, TODAY);

  assert.equal(invoices[0].outstanding, 0);
  assert.equal(invoices[0].daysOverdue, null);
  assert.equal(invoices[0].agingBucket, 'Paid');
});

test('does not allow zero, negative, or excessive payments', () => {
  assert.throws(() => validatePayment(0, 500), /greater than zero/);
  assert.throws(() => validatePayment(-10, 500), /greater than zero/);
  assert.throws(() => validatePayment(501, 500), /cannot exceed/);
  assert.equal(validatePayment(500, 500), 500);
});
