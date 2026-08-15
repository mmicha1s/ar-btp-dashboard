namespace ar;

using { cuid } from '@sap/cds/common';

entity Customers : cuid {
  name         : String(120);
  country      : String(2);
  creditLimit  : Decimal(15,2);
  invoices     : Association to many Invoices on invoices.customer = $self;
}

entity Invoices : cuid {
  number       : String(20);
  customer     : Association to Customers;
  invoiceDate  : Date;
  dueDate      : Date;
  amount       : Decimal(15,2);
  currency     : String(3);
  payments     : Association to many Payments on payments.invoice = $self;
}

entity Payments : cuid {
  invoice      : Association to Invoices;
  paymentDate  : Date;
  amount       : Decimal(15,2);
}
