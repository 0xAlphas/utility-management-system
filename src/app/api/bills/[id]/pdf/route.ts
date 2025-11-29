import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// GET PDF for a bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    // Await params in Next.js 15+
    const { id } = await params;

    // Fetch bill with customer and payment details
    const bill = await prisma.bill.findUnique({
      where: { id },
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

    console.log('Bill data:', {
      billNumber: bill.billNumber,
      customerName: bill.customer.name,
      status: bill.status,
      hasRemarks: !!bill.remarks,
    });

    // Parse bill details from remarks
    let billDetails: any[] = [];
    try {
      billDetails = bill.remarks ? JSON.parse(bill.remarks) : [];
      console.log('Bill details count:', billDetails.length);
    } catch (e) {
      console.error('Error parsing bill remarks:', e);
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

    // Helper function to sanitize and ensure text is valid for PDF
    const sanitizeText = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      // Convert to string and remove any characters that might cause issues
      const str = String(value);
      // Replace problematic characters with safe alternatives
      return str
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/[\u2018\u2019]/g, "'") // Replace smart quotes
        .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
        .replace(/[\u2013\u2014]/g, '-') // Replace em/en dashes
        .replace(/[\u2026]/g, '...') // Replace ellipsis
        .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII
        .trim();
    };

    // Helper function to draw text - ALWAYS sanitize before calling
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
      if (!text || text.length === 0) return; // Don't draw empty text

      try {
        page.drawText(text, {
          x,
          y,
          size: options.size || 12,
          font: options.font || regularFont,
          color: options.color || rgb(0, 0, 0),
          maxWidth: options.maxWidth || width - 2 * margin,
        });
      } catch (error) {
        console.error('Error drawing text:', text, error);
        // Try to draw a placeholder instead
        try {
          page.drawText('[Error]', {
            x,
            y,
            size: options.size || 12,
            font: options.font || regularFont,
            color: rgb(1, 0, 0),
          });
        } catch (e) {
          // Ignore if even placeholder fails
        }
      }
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
    try {
      console.log('Drawing header section...');
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
      const billNum = sanitizeText(bill.billNumber || 'N/A');
      console.log('Bill number:', billNum);
      drawText(sanitizeText('Bill No: ' + billNum), rightX, yPosition + lineHeight, {
        font: boldFont,
      });

      const issueDate = bill.issueDate
        ? new Date(bill.issueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
        : 'N/A';
      console.log('Issue date:', issueDate);
      drawText(sanitizeText('Date: ' + issueDate), rightX, yPosition);
      yPosition -= lineHeight * 2;

      drawLine(yPosition);
      yPosition -= lineHeight * 1.5;
      console.log('Header section completed');
    } catch (error) {
      console.error('Error in header section:', error);
      throw new Error(`Header section error: ${error}`);
    }

    // Customer Section
    try {
      console.log('Drawing customer section...');
      drawText('BILL TO:', margin, yPosition, {
        size: 14,
        font: boldFont,
      });
      yPosition -= lineHeight * 1.2;

      const customerName = sanitizeText(bill.customer.name || 'N/A');
      console.log('Customer name:', customerName);
      drawText(customerName, margin, yPosition, {
        font: boldFont,
        size: 11,
      });
      yPosition -= lineHeight * 0.8;

      const customerType = sanitizeText(bill.customer.type || 'N/A');
      drawText(sanitizeText('Customer Type: ' + customerType), margin, yPosition, {
        size: 10,
      });
      yPosition -= lineHeight * 0.8;

      if (bill.customer.address) {
        const addressParts = [];
        if (bill.customer.address) addressParts.push(sanitizeText(bill.customer.address));
        if (bill.customer.city) addressParts.push(sanitizeText(bill.customer.city));
        const addressLine = addressParts.join(', ');

        if (addressLine) {
          if (bill.customer.postalCode) {
            const fullAddress = addressLine + ' - ' + sanitizeText(bill.customer.postalCode);
            drawText(sanitizeText(fullAddress), margin, yPosition, {
              size: 10,
            });
          } else {
            drawText(addressLine, margin, yPosition, { size: 10 });
          }
          yPosition -= lineHeight * 0.8;
        }
      }

      if (bill.customer.contact) {
        const contactText = 'Contact: ' + sanitizeText(bill.customer.contact);
        drawText(sanitizeText(contactText), margin, yPosition, {
          size: 10,
        });
        yPosition -= lineHeight * 0.8;
      }

      if (bill.customer.email) {
        const emailText = 'Email: ' + sanitizeText(bill.customer.email);
        drawText(sanitizeText(emailText), margin, yPosition, {
          size: 10,
        });
        yPosition -= lineHeight * 0.8;
      }

      yPosition -= lineHeight;
      console.log('Customer section completed');
    } catch (error) {
      console.error('Error in customer section:', error);
      throw new Error(`Customer section error: ${error}`);
    }

    // Billing Period
    try {
      console.log('Drawing billing period section...');
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
      const monthIndex = (bill.billingMonth || 1) - 1;
      const monthName = monthNames[Math.max(0, Math.min(11, monthIndex))] || 'Unknown';
      const year = bill.billingYear || new Date().getFullYear();
      const periodText = monthName + ' ' + String(year);
      console.log('Billing period:', periodText);

      drawText(sanitizeText(periodText), margin, yPosition, { size: 11 });
      yPosition -= lineHeight * 1.5;

      drawLine(yPosition);
      yPosition -= lineHeight * 1.5;
      console.log('Billing period section completed');
    } catch (error) {
      console.error('Error in billing period section:', error);
      throw new Error(`Billing period section error: ${error}`);
    }

    // Utility Details Section
    try {
      console.log('Drawing consumption details section...');
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
      console.log('Table header completed');
    } catch (error) {
      console.error('Error in consumption details header:', error);
      throw new Error(`Consumption details header error: ${error}`);
    }

    // Bill details rows
    try {
      console.log('Drawing bill details rows, count:', billDetails.length);
      const colX = {
        utility: margin,
        meter: margin + 120,
        previous: margin + 220,
        current: margin + 310,
        usage: margin + 390,
        amount: margin + 450,
      };

      for (let i = 0; i < billDetails.length; i++) {
        const detail = billDetails[i];
        console.log(`Processing detail ${i + 1}:`, {
          utilityType: detail.utilityType,
          meterNumber: detail.meterNumber,
        });

        drawText(sanitizeText(detail.utilityType || 'N/A'), colX.utility + 5, yPosition, {
          size: 10,
        });
        drawText(sanitizeText(detail.meterNumber || 'N/A'), colX.meter, yPosition, {
          size: 10,
        });

        const prevReading = typeof detail.previousReading === 'number'
          ? detail.previousReading.toFixed(2)
          : '0.00';
        drawText(prevReading, colX.previous, yPosition, { size: 10 });

        const currReading = typeof detail.currentReading === 'number'
          ? detail.currentReading.toFixed(2)
          : '0.00';
        drawText(currReading, colX.current, yPosition, { size: 10 });

        const consumption = typeof detail.consumption === 'number'
          ? detail.consumption.toFixed(2)
          : '0.00';
        drawText(consumption, colX.usage, yPosition, { size: 10 });

        const amount = typeof detail.amount === 'number'
          ? detail.amount.toFixed(2)
          : '0.00';
        drawText(sanitizeText('Rs. ' + amount), colX.amount, yPosition, { size: 10 });

        yPosition -= lineHeight;

        // If there's a breakdown, show it
        if (detail.breakdown && Array.isArray(detail.breakdown) && detail.breakdown.length > 0) {
          console.log(`Detail ${i + 1} has ${detail.breakdown.length} slabs`);
          for (let j = 0; j < detail.breakdown.length; j++) {
            const slab = detail.breakdown[j];
            const slabName = sanitizeText(slab.slabName || 'Unknown');
            const slabUnits = typeof slab.units === 'number' ? slab.units.toFixed(2) : '0.00';
            const slabRate = typeof slab.rate === 'number' ? slab.rate.toFixed(2) : '0.00';
            const slabAmount = typeof slab.amount === 'number' ? slab.amount.toFixed(2) : '0.00';

            const slabText = '  ' + slabName + ': ' + slabUnits + ' units @ Rs. ' + slabRate + ' = Rs. ' + slabAmount;
            drawText(sanitizeText(slabText), colX.utility + 10, yPosition, {
              size: 8,
              color: rgb(0.4, 0.4, 0.4),
            });
            yPosition -= lineHeight * 0.8;
          }
        }

        yPosition -= lineHeight * 0.3;
      }

      yPosition -= lineHeight * 0.5;
      drawLine(yPosition);
      yPosition -= lineHeight * 1.2;
      console.log('Bill details rows completed');
    } catch (error) {
      console.error('Error in bill details rows:', error);
      throw new Error(`Bill details rows error: ${error}`);
    }

    // Summary Section
    const totalConsumption = typeof bill.consumption === 'number'
      ? bill.consumption.toFixed(2)
      : '0.00';
    const totalAmount = typeof bill.totalAmount === 'number'
      ? bill.totalAmount.toFixed(2)
      : '0.00';
    const paidAmount = typeof bill.paidAmount === 'number'
      ? bill.paidAmount.toFixed(2)
      : '0.00';
    const outstandingAmount = typeof bill.outstandingAmount === 'number'
      ? bill.outstandingAmount.toFixed(2)
      : '0.00';

    const summaryRightX = width - margin - 100;

    drawText('Total Consumption:', margin, yPosition, {
      font: boldFont,
      size: 11,
    });
    drawText(
      sanitizeText(totalConsumption + ' units'),
      summaryRightX,
      yPosition,
      { font: boldFont, size: 11 }
    );
    yPosition -= lineHeight * 1.2;

    drawText('Total Amount:', margin, yPosition, {
      font: boldFont,
      size: 12,
    });
    drawText(
      sanitizeText('Rs. ' + totalAmount),
      summaryRightX,
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
        sanitizeText('Rs. ' + paidAmount),
        summaryRightX,
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
        sanitizeText('Rs. ' + outstandingAmount),
        summaryRightX,
        yPosition,
        { font: boldFont, size: 11, color: rgb(0.8, 0, 0) }
      );
      yPosition -= lineHeight * 1.2;
    }

    const dueDate = bill.dueDate
      ? new Date(bill.dueDate).toLocaleDateString()
      : 'N/A';
    drawText(
      sanitizeText('Due Date: ' + dueDate),
      margin,
      yPosition,
      { font: boldFont, size: 10 }
    );
    yPosition -= lineHeight * 2;

    drawLine(yPosition);
    yPosition -= lineHeight * 1.5;

    // Payment Status Section
    const billStatus = bill.status || 'UNPAID';
    const statusColor =
      billStatus === 'PAID'
        ? rgb(0, 0.6, 0)
        : billStatus === 'OVERDUE'
        ? rgb(0.8, 0, 0)
        : rgb(0.8, 0.5, 0);

    drawText('PAYMENT STATUS:', margin, yPosition, {
      font: boldFont,
      size: 14,
    });
    drawText(billStatus, margin + 150, yPosition, {
      font: boldFont,
      size: 14,
      color: statusColor,
    });
    yPosition -= lineHeight * 1.5;

    // Payment History
    if (bill.payments && Array.isArray(bill.payments) && bill.payments.length > 0) {
      drawText('Payment History:', margin, yPosition, {
        font: boldFont,
        size: 11,
      });
      yPosition -= lineHeight;

      for (const payment of bill.payments.slice(0, 5)) {
        // Show last 5 payments
        try {
          const paymentDate = payment.paymentDate
            ? new Date(payment.paymentDate).toLocaleDateString()
            : 'N/A';
          const paymentAmount = typeof payment.amount === 'number'
            ? payment.amount.toFixed(2)
            : '0.00';
          const paymentMethod = sanitizeText(payment.paymentMethod || 'N/A');

          const paymentText = paymentDate + ' - Rs. ' + paymentAmount + ' (' + paymentMethod + ')';
          drawText(sanitizeText(paymentText), margin + 10, yPosition, {
            size: 9,
            color: rgb(0.3, 0.3, 0.3),
          });
          yPosition -= lineHeight * 0.8;
        } catch (e) {
          // Skip invalid payment entries
          console.error('Error rendering payment:', e);
        }
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
    const customerName = bill.customer.name || 'Customer';
    const safeCustomerName = customerName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .substring(0, 30);
    const safeBillNumber = (bill.billNumber || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `bill_${safeBillNumber}_${safeCustomerName}.pdf`;

    // Return PDF as downloadable file
    return new NextResponse(Buffer.from(pdfBytes), {
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
