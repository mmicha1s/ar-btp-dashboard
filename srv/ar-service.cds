using { ar } from '../db/schema';

service ARService {

  @readonly
  entity Customers as projection on ar.Customers;

  @readonly
  entity Invoices as projection on ar.Invoices {
    *,
    null as outstanding  : Decimal(15,2) @Core.Computed,
    null as daysOverdue  : Integer       @Core.Computed,
    null as agingBucket  : String(10)    @Core.Computed
  };

  @readonly
  entity Payments as projection on ar.Payments;

  type ARSummaryType {
    totalReceivables : Decimal(15,2);
    totalOverdue     : Decimal(15,2);
    dueThisMonth     : Decimal(15,2);
    overdueCustomers : Integer;
  }

  type AgingBucketType {
    bucket : String(20);
    amount : Decimal(15,2);
  }

  function getARSummary() returns ARSummaryType;
  function getAgingSummary() returns many AgingBucketType;
  action addPayment(invoiceId : UUID, paymentDate : Date, amount : Decimal(15,2)) returns Payments;
}
