import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// GET PDF for a bill
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    // Fetch bill with customer and payment details
    const bill = await prisma.bill.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
            contact: true,
            email: true,
            address: true,
            city: true,
            postalCode: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Parse bill details from remarks
    let billDetails: any[] = [];
    try {
      billDetails = bill.remarks ? JSON.parse(bill.remarks) : [];
    } catch (e) {
      billDetails = [];
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    // Load fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let yPosition = height - 50;
    const margin = 50;
    const lineHeight = 20;

    // Helper function to draw text
    const drawText = (
      text: string,
      x: number,
      y: number,
      options: {
        size?: number;
        font?: any;
        color?: any;
        maxWidth?: number;
      } = {}
    ) => {
      page.drawText(text, {
        x,
        y,
        size: options.size || 12,
        font: options.font || regularFont,
        color: options.color || rgb(0, 0, 0),
        maxWidth: options.maxWidth || width - 2 * margin,
      });
    };

    // Helper function to draw line
    const drawLine = (y: number, lineWidth: number = 1) => {
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: lineWidth,
        color: rgb(0.8, 0.8, 0.8),
      });
    };

    // Header Section
    drawText('UTILITY MANAGEMENT SYSTEM', margin, yPosition, {
      size: 20,
      font: boldFont,
    });
    yPosition -= lineHeight * 1.5;

    drawText('Bill Invoice', margin, yPosition, {
      size: 14,
      font: boldFont,
    });
    yPosition -= lineHeight;

    // Bill Info (Right aligned)
    const rightX = width - margin - 150;
    drawText(`Bill No: ${bill.billNumber}`, rightX, yPosition + lineHeight, {
      font: boldFont,
    });
    drawText(
      `Date: ${new Date(bill.issueDate).toLocaleDateString()}`,
      rightX,
      yPosition
    );
    yPosition -= lineHeight * 2;

    drawLine(yPosition);
    yPosition -= lineHeight * 1.5;

    // Customer Section
    drawText('BILL TO:', margin, yPosition, {
      size: 14,
      font: boldFont,
    });
    yPosition -= lineHeight * 1.2;

    drawText(`${bill.customer.name}`, margin, yPosition, {
      font: boldFont,
      size: 11,
    });
    yPosition -= lineHeight * 0.8;

    drawText(`Customer Type: ${bill.customer.type}`, margin, yPosition, {
      size: 10,
    });
    yPosition -= lineHeight * 0.8;

    if (bill.customer.address) {
      const addressLine = bill.customer.city
        ? `${bill.customer.address}, ${bill.customer.city}`
        : bill.customer.address;
      if (bill.customer.postalCode) {
        drawText(`${addressLine} - ${bill.customer.postalCode}`, margin, yPosition, {
          size: 10,
        });
      } else {
        drawText(addressLine, margin, yPosition, { size: 10 });
      }
      yPosition -= lineHeight * 0.8;
    }

    if (bill.customer.contact) {
      drawText(`Contact: ${bill.customer.contact}`, margin, yPosition, {
        size: 10,
      });
      yPosition -= lineHeight * 0.8;
    }

    if (bill.customer.email) {
      drawText(`Email: ${bill.customer.email}`, margin, yPosition, {
        size: 10,
      });
      yPosition -= lineHeight * 0.8;
    }

    yPosition -= lineHeight;

    // Billing Period
    drawText('BILLING PERIOD:', margin, yPosition, {
      size: 14,
      font: boldFont,
    });
    yPosition -= lineHeight * 1.2;

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    drawText(
      `${monthNames[bill.billingMonth - 1]} ${bill.billingYear}`,
      margin,
      yPosition,
      { size: 11 }
    );
    yPosition -= lineHeight * 1.5;

    drawLine(yPosition);
    yPosition -= lineHeight * 1.5;

    // Utility Details Section
    drawText('CONSUMPTION DETAILS:', margin, yPosition, {
      size: 14,
      font: boldFont,
    });
    yPosition -= lineHeight * 1.5;

    // Table headers
    const colX = {
      utility: margin,
      meter: margin + 120,
      previous: margin + 220,
      current: margin + 310,
      usage: margin + 390,
      amount: margin + 450,
    };

    // Header row with background
    page.drawRectangle({
      x: margin,
      y: yPosition - 5,
      width: width - 2 * margin,
      height: lineHeight,
      color: rgb(0.95, 0.95, 0.95),
    });

    drawText('Utility Type', colX.utility + 5, yPosition, {
      font: boldFont,
      size: 10,
    });
    drawText('Meter No.', colX.meter, yPosition, {
      font: boldFont,
      size: 10,
    });
    drawText('Previous', colX.previous, yPosition, {
      font: boldFont,
      size: 10,
    });
    drawText('Current', colX.current, yPosition, {
      font: boldFont,
      size: 10,
    });
    drawText('Usage', colX.usage, yPosition, {
      font: boldFont,
      size: 10,
    });
    drawText('Amount', colX.amount, yPosition, {
      font: boldFont,
      size: 10,
    });
    yPosition -= lineHeight * 1.2;

    // Bill details rows
    for (const detail of billDetails) {
      drawText(detail.utilityType || 'N/A', colX.utility + 5, yPosition, {
        size: 10,
      });
      drawText(detail.meterNumber || 'N/A', colX.meter, yPosition, {
        size: 10,
      });
      drawText(
        detail.previousReading?.toFixed(2) || '0',
        colX.previous,
        yPosition,
        { size: 10 }
      );
      drawText(
        detail.currentReading?.toFixed(2) || '0',
        colX.current,
        yPosition,
        { size: 10 }
      );
      drawText(
        detail.consumption?.toFixed(2) || '0',
        colX.usage,
        yPosition,
        { size: 10 }
      );
      drawText(
        `Rs. ${detail.amount?.toFixed(2) || '0.00'}`,
        colX.amount,
        yPosition,
        { size: 10 }
      );
      yPosition -= lineHeight;

      // If there's a breakdown, show it
      if (detail.breakdown && detail.breakdown.length > 0) {
        for (const slab of detail.breakdown) {
          drawText(
            `  ${slab.slabName}: ${slab.units.toFixed(2)} units @ Rs. ${slab.rate.toFixed(2)} = Rs. ${slab.amount.toFixed(2)}`,
            colX.utility + 10,
            yPosition,
            { size: 8, color: rgb(0.4, 0.4, 0.4) }
          );
          yPosition -= lineHeight * 0.8;
        }
      }

      yPosition -= lineHeight * 0.3;
    }

    yPosition -= lineHeight * 0.5;
    drawLine(yPosition);
    yPosition -= lineHeight * 1.2;

    // Summary Section
    drawText('Total Consumption:', margin, yPosition, {
      font: boldFont,
      size: 11,
    });
    drawText(
      `${bill.consumption.toFixed(2)} units`,
      colX.amount,
      yPosition,
      { font: boldFont, size: 11 }
    );
    yPosition -= lineHeight * 1.2;

    drawText('Total Amount:', margin, yPosition, {
      font: boldFont,
      size: 12,
    });
    drawText(
      `Rs. ${bill.totalAmount.toFixed(2)}`,
      colX.amount,
      yPosition,
      { font: boldFont, size: 12 }
    );
    yPosition -= lineHeight * 1.2;

    if (bill.paidAmount > 0) {
      drawText('Paid Amount:', margin, yPosition, {
        font: boldFont,
        size: 11,
        color: rgb(0, 0.6, 0),
      });
      drawText(
        `Rs. ${bill.paidAmount.toFixed(2)}`,
        colX.amount,
        yPosition,
        { font: boldFont, size: 11, color: rgb(0, 0.6, 0) }
      );
      yPosition -= lineHeight * 1.2;
    }

    if (bill.outstandingAmount > 0) {
      drawText('Outstanding Amount:', margin, yPosition, {
        font: boldFont,
        size: 11,
        color: rgb(0.8, 0, 0),
      });
      drawText(
        `Rs. ${bill.outstandingAmount.toFixed(2)}`,
        colX.amount,
        yPosition,
        { font: boldFont, size: 11, color: rgb(0.8, 0, 0) }
      );
      yPosition -= lineHeight * 1.2;
    }

    drawText(
      `Due Date: ${new Date(bill.dueDate).toLocaleDateString()}`,
      margin,
      yPosition,
      { font: boldFont, size: 10 }
    );
    yPosition -= lineHeight * 2;

    drawLine(yPosition);
    yPosition -= lineHeight * 1.5;

    // Payment Status Section
    const statusColor =
      bill.status === 'PAID'
        ? rgb(0, 0.6, 0)
        : bill.status === 'OVERDUE'
        ? rgb(0.8, 0, 0)
        : rgb(0.8, 0.5, 0);

    drawText('PAYMENT STATUS:', margin, yPosition, {
      font: boldFont,
      size: 14,
    });
    drawText(bill.status, margin + 150, yPosition, {
      font: boldFont,
      size: 14,
      color: statusColor,
    });
    yPosition -= lineHeight * 1.5;

    // Payment History
    if (bill.payments.length > 0) {
      drawText('Payment History:', margin, yPosition, {
        font: boldFont,
        size: 11,
      });
      yPosition -= lineHeight;

      for (const payment of bill.payments.slice(0, 5)) {
        // Show last 5 payments
        const paymentDate = new Date(payment.paymentDate).toLocaleDateString();
        const paymentText = `${paymentDate} - Rs. ${payment.amount.toFixed(2)} (${payment.method})`;
        drawText(paymentText, margin + 10, yPosition, {
          size: 9,
          color: rgb(0.3, 0.3, 0.3),
        });
        yPosition -= lineHeight * 0.8;
      }
      yPosition -= lineHeight * 0.5;
    }

    // Footer
    yPosition = 80;
    drawLine(yPosition + 10);
    drawText(
      'Thank you for using our services.',
      margin,
      yPosition - 10,
      { size: 10, font: boldFont }
    );
    drawText(
      'For any queries, please contact our customer service.',
      margin,
      yPosition - 25,
      { size: 9 }
    );

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Create safe filename
    const safeCustomerName = bill.customer.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    const filename = `bill_${bill.billNumber}_${safeCustomerName}.pdf`;

    // Return PDF as downloadable file
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
