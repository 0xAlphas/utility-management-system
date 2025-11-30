import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface BillDetails {
  utilityType?: string;
  meterNumber?: string;
  previousReading?: number;
  currentReading?: number;
  tariffBreakdown?: Array<{
    name: string;
    usage: number;
    rate: number;
    amount: number;
  }>;
}

interface Customer {
  name: string;
  type: string;
  contact: string;
  email: string | null;
  address: string;
  city: string | null;
  postalCode: string | null;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: Date | string;
  paymentMethod: string;
  referenceNumber: string | null;
}

interface Bill {
  id: string;
  billNumber: string;
  billingMonth: number;
  billingYear: number;
  issueDate: Date | string;
  dueDate: Date | string;
  previousReading: number | null;
  currentReading: number | null;
  consumption: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  remarks: string | null;
  customer: Customer;
  payments: Payment[];
}

export async function generateBillPDF(bill: Bill): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let billDetails: BillDetails = {};
  try {
    billDetails = bill.remarks ? JSON.parse(bill.remarks) : {};
  } catch (e) {
    billDetails = {};
  }

  const primaryColor = rgb(0.2, 0.4, 0.8);
  const textColor = rgb(0.1, 0.1, 0.1);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const grayText = rgb(0.4, 0.4, 0.4);

  let yPosition = height - 50;

  page.drawText('UTILITY MANAGEMENT SYSTEM', {
    x: 50,
    y: yPosition,
    size: 24,
    font: fontBold,
    color: primaryColor,
  });

  yPosition -= 15;
  page.drawText('Electricity • Water • Gas Services', {
    x: 50,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: grayText,
  });

  yPosition -= 40;

  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 2,
    color: primaryColor,
  });

  yPosition -= 30;

  page.drawText('UTILITY BILL', {
    x: 50,
    y: yPosition,
    size: 18,
    font: fontBold,
    color: textColor,
  });

  const billInfoX = width - 200;
  page.drawText(`Bill Number: ${bill.billNumber}`, {
    x: billInfoX,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: textColor,
  });

  yPosition -= 20;

  const issueDate = new Date(bill.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dueDate = new Date(bill.dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  page.drawText(`Issue Date: ${issueDate}`, {
    x: billInfoX,
    y: yPosition,
    size: 9,
    font: fontRegular,
    color: grayText,
  });

  yPosition -= 15;

  page.drawText(`Due Date: ${dueDate}`, {
    x: billInfoX,
    y: yPosition,
    size: 9,
    font: fontRegular,
    color: grayText,
  });

  yPosition -= 15;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const billingPeriod = `${monthNames[bill.billingMonth - 1]} ${bill.billingYear}`;

  page.drawText(`Billing Period: ${billingPeriod}`, {
    x: billInfoX,
    y: yPosition,
    size: 9,
    font: fontRegular,
    color: grayText,
  });

  yPosition -= 40;

  page.drawText('CUSTOMER INFORMATION', {
    x: 50,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: primaryColor,
  });

  yPosition -= 20;

  page.drawRectangle({
    x: 50,
    y: yPosition - 60,
    width: width - 100,
    height: 70,
    color: lightGray,
  });

  yPosition -= 5;

  page.drawText(`Name: ${bill.customer.name}`, {
    x: 60,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  });

  yPosition -= 15;

  page.drawText(`Customer Type: ${bill.customer.type}`, {
    x: 60,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  });

  yPosition -= 15;

  page.drawText(`Contact: ${bill.customer.contact}`, {
    x: 60,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  });

  if (bill.customer.email) {
    page.drawText(`Email: ${bill.customer.email}`, {
      x: 300,
      y: yPosition,
      size: 10,
      font: fontRegular,
      color: textColor,
    });
  }

  yPosition -= 15;

  const address = [
    bill.customer.address,
    bill.customer.city,
    bill.customer.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  page.drawText(`Address: ${address}`, {
    x: 60,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  });

  yPosition -= 35;

  if (billDetails.utilityType || billDetails.meterNumber) {
    page.drawText('METER & CONSUMPTION DETAILS', {
      x: 50,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 20;

    if (billDetails.utilityType) {
      page.drawText(`Utility Type: ${billDetails.utilityType}`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: fontRegular,
        color: textColor,
      });
      yPosition -= 15;
    }

    if (billDetails.meterNumber) {
      page.drawText(`Meter Number: ${billDetails.meterNumber}`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: fontRegular,
        color: textColor,
      });
      yPosition -= 15;
    }

    if (bill.previousReading !== null || billDetails.previousReading !== undefined) {
      const prevReading = bill.previousReading ?? billDetails.previousReading ?? 0;
      page.drawText(`Previous Reading: ${prevReading.toFixed(2)} units`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: fontRegular,
        color: textColor,
      });
      yPosition -= 15;
    }

    if (bill.currentReading !== null || billDetails.currentReading !== undefined) {
      const currReading = bill.currentReading ?? billDetails.currentReading ?? 0;
      page.drawText(`Current Reading: ${currReading.toFixed(2)} units`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: fontRegular,
        color: textColor,
      });
      yPosition -= 15;
    }

    page.drawText(`Total Consumption: ${bill.consumption.toFixed(2)} units`, {
      x: 60,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: textColor,
    });

    yPosition -= 30;
  }

  if (billDetails.tariffBreakdown && billDetails.tariffBreakdown.length > 0) {
    page.drawText('TARIFF BREAKDOWN', {
      x: 50,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 25;

    const tableX = 60;
    const colWidths = [200, 80, 80, 80];

    page.drawRectangle({
      x: tableX - 5,
      y: yPosition - 12,
      width: colWidths.reduce((a, b) => a + b, 0) + 10,
      height: 20,
      color: lightGray,
    });

    page.drawText('Tariff Slab', {
      x: tableX,
      y: yPosition,
      size: 9,
      font: fontBold,
      color: textColor,
    });

    page.drawText('Usage', {
      x: tableX + colWidths[0],
      y: yPosition,
      size: 9,
      font: fontBold,
      color: textColor,
    });

    page.drawText('Rate', {
      x: tableX + colWidths[0] + colWidths[1],
      y: yPosition,
      size: 9,
      font: fontBold,
      color: textColor,
    });

    page.drawText('Amount', {
      x: tableX + colWidths[0] + colWidths[1] + colWidths[2],
      y: yPosition,
      size: 9,
      font: fontBold,
      color: textColor,
    });

    yPosition -= 20;

    billDetails.tariffBreakdown.forEach((tariff) => {
      page.drawText(tariff.name, {
        x: tableX,
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: textColor,
      });

      page.drawText(`${tariff.usage.toFixed(2)}`, {
        x: tableX + colWidths[0],
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: textColor,
      });

      page.drawText(`$${tariff.rate.toFixed(2)}`, {
        x: tableX + colWidths[0] + colWidths[1],
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: textColor,
      });

      page.drawText(`$${tariff.amount.toFixed(2)}`, {
        x: tableX + colWidths[0] + colWidths[1] + colWidths[2],
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: textColor,
      });

      yPosition -= 15;
    });

    yPosition -= 10;
  }

  page.drawText('BILLING SUMMARY', {
    x: 50,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: primaryColor,
  });

  yPosition -= 25;

  const summaryX = width - 250;

  page.drawRectangle({
    x: summaryX - 10,
    y: yPosition - 60,
    width: 200,
    height: 75,
    color: lightGray,
  });

  yPosition -= 5;

  page.drawText('Total Amount:', {
    x: summaryX,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  });

  page.drawText(`$${bill.totalAmount.toFixed(2)}`, {
    x: summaryX + 120,
    y: yPosition,
    size: 10,
    font: fontBold,
    color: textColor,
  });

  yPosition -= 18;

  page.drawText('Paid Amount:', {
    x: summaryX,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: textColor,
  });

  page.drawText(`$${bill.paidAmount.toFixed(2)}`, {
    x: summaryX + 120,
    y: yPosition,
    size: 10,
    font: fontRegular,
    color: rgb(0, 0.6, 0),
  });

  yPosition -= 18;

  page.drawText('Outstanding:', {
    x: summaryX,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: textColor,
  });

  const outstandingColor = bill.outstandingAmount > 0 ? rgb(0.8, 0, 0) : rgb(0, 0.6, 0);
  page.drawText(`$${bill.outstandingAmount.toFixed(2)}`, {
    x: summaryX + 120,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: outstandingColor,
  });

  yPosition -= 30;

  const statusColors: Record<string, { bg: any; text: any }> = {
    PAID: { bg: rgb(0, 0.6, 0), text: rgb(1, 1, 1) },
    UNPAID: { bg: rgb(0.8, 0, 0), text: rgb(1, 1, 1) },
    PARTIALLY_PAID: { bg: rgb(0.9, 0.6, 0), text: rgb(1, 1, 1) },
    OVERDUE: { bg: rgb(0.6, 0, 0.2), text: rgb(1, 1, 1) },
  };

  const statusColor = statusColors[bill.status] || { bg: rgb(0.5, 0.5, 0.5), text: rgb(1, 1, 1) };

  page.drawRectangle({
    x: summaryX - 10,
    y: yPosition - 5,
    width: 100,
    height: 20,
    color: statusColor.bg,
  });

  page.drawText(`Status: ${bill.status}`, {
    x: summaryX,
    y: yPosition,
    size: 9,
    font: fontBold,
    color: statusColor.text,
  });

  yPosition -= 35;

  if (bill.payments && bill.payments.length > 0) {
    page.drawText('PAYMENT HISTORY', {
      x: 50,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: primaryColor,
    });

    yPosition -= 25;

    bill.payments.slice(0, 3).forEach((payment) => {
      const paymentDate = new Date(payment.paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const paymentText = `${paymentDate} - $${payment.amount.toFixed(2)} (${payment.paymentMethod})`;
      const refText = payment.referenceNumber ? ` - Ref: ${payment.referenceNumber}` : '';

      page.drawText(paymentText + refText, {
        x: 60,
        y: yPosition,
        size: 9,
        font: fontRegular,
        color: textColor,
      });

      yPosition -= 15;
    });

    if (bill.payments.length > 3) {
      page.drawText(`... and ${bill.payments.length - 3} more payment(s)`, {
        x: 60,
        y: yPosition,
        size: 8,
        font: fontRegular,
        color: grayText,
      });
      yPosition -= 20;
    }
  }

  const footerY = 50;

  page.drawLine({
    start: { x: 50, y: footerY + 20 },
    end: { x: width - 50, y: footerY + 20 },
    thickness: 1,
    color: grayText,
  });

  page.drawText('This is a system-generated bill. No signature required.', {
    x: 50,
    y: footerY,
    size: 8,
    font: fontRegular,
    color: grayText,
  });

  page.drawText(`Generated on: ${new Date().toLocaleString('en-US')}`, {
    x: width - 200,
    y: footerY,
    size: 8,
    font: fontRegular,
    color: grayText,
  });

  const pdfBytes = await pdfDoc.save();

  return pdfBytes;
}
