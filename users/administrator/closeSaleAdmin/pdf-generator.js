class PDFGenerator {

    constructor() {
        this.doc = null
    }

    async generateSalePDF(saleData, products) {
        const { jsPDF } = window.jspdf

        this.doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "letter"
        })

        await this.addHeader(saleData)
        this.addCustomerInfo(saleData)
        this.addProductsTable(products)

        if (saleData.additionalCharges && saleData.additionalCharges.length > 0) {
            this.addAdditionalCharges(saleData.additionalCharges)
        }

        this.addTotals(saleData)
        
        // Agregar términos y condiciones si existen
        if (saleData.terms && saleData.terms.trim() !== '') {
            this.addTermsAndConditions(saleData.terms)
        }

        this.addFooter()

        return this.doc.output("blob")
    }
    
    async addHeader(saleData) {
        // Logo a la derecha - más pequeño y arriba
        try {
            const logoPath = '/assets/icons/luckyPDF2.png'
            const logoImage = await this.loadImage(logoPath)
            this.doc.addImage(logoImage, 'PNG', 140, 3, 65, 65)
        } catch (error) {
            console.error('Error loading logo:', error)
            this.doc.setFont("helvetica", "bold")
            this.doc.setFontSize(10)
            this.doc.setTextColor(10, 37, 64)
            this.doc.text("LUCKY APPLIANCES", 160, 20)
        }

        // Información de la empresa - más compacta
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(9)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("LUCKY APPLIANCES, LLC", 20, 18)

        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(7)
        this.doc.setTextColor(80, 80, 80)
        this.doc.text("3990 WEST RUSELL ROAD", 20, 24)
        this.doc.text("LAS VEGAS NEVADA, 89118", 20, 29)
        this.doc.text("SUIT 6", 20, 34)
        this.doc.text("PHONE: 725 300 1480", 20, 39)

        // Título centrado
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(16)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("INVOICE", 105, 55, { align: "center" })

        // Número de factura y fecha centrados
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(9)
        this.doc.setTextColor(0, 0, 0)
        
        const date = new Date().toLocaleDateString("en-US")
        const invoiceInfo = `${saleData.saleNumber}     DATE: ${date}`
        this.doc.text(invoiceInfo, 105, 63, { align: "center" })

        // Línea separadora - más delgada y más arriba
        this.doc.setDrawColor(200, 200, 200)
        this.doc.setLineWidth(0.3)
        this.doc.line(20, 70, 190, 70)
        
        // Guardar posición Y después del header
        this.doc.headerEndY = 72
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = "Anonymous"
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = url
        })
    }
    
    addCustomerInfo(saleData) {
        // Start Y después del header (reducido)
        let startY = this.doc.headerEndY + 2
        
        // Título "CUSTOMER:" en azul sin línea
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(9)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("CUSTOMER:", 20, startY)
        
        // Información del cliente - con etiquetas individuales en formato continuo
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(8)
        this.doc.setTextColor(0, 0, 0)
        
        const customerName = saleData.customer.name || "N/A"
        const customerPhone = saleData.customer.phone || "N/A"
        const customerEmail = saleData.customer.email || "N/A"
        const customerAddress = saleData.customer.address || "N/A"
        
        // Construir el texto con etiquetas
        const customerInfo = `Name: ${customerName} | Phone: ${customerPhone} | Email: ${customerEmail} | Address: ${customerAddress}`
        
        // Split text to fit width
        const customerLines = this.doc.splitTextToSize(customerInfo, 165)
        
        this.doc.text(customerLines, 20, startY + 5)
        
        // Store Y position for next element
        const customerLinesCount = customerLines.length
        this.doc.lastCustomerInfoY = startY + 5 + (customerLinesCount * 4) + 3
    }

    addProductsTable(products) {
        // Columnas: S/N, DESCRIPTION, MODEL, PRICE (sin SKU)
        const columns = [
            "S/N",
            "DESCRIPTION",
            "MODEL",
            "PRICE"
        ]

        const rows = []

        products.forEach(product => {
            // Obtener la descripción de manera más inteligente
            let description = "N/A"
            if (product.description && product.description !== "N/A") {
                description = product.description
            } else if (product.ItemDescription && product.ItemDescription !== "N/A") {
                description = product.ItemDescription
            } else if (product.model && product.model !== "N/A") {
                description = product.model
            } else {
                description = "Product"
            }
            
            rows.push([
                product.serialNumber || "N/A",
                description,
                product.model || "N/A",
                `$${Number(product.price).toFixed(2)}`
            ])
        })

        // Start Y position después de customer info (reduced margin)
        const startY = (this.doc.lastCustomerInfoY || 78) + 2

        this.doc.autoTable({
            head: [columns],
            body: rows,
            startY: startY,
            theme: "grid",
            styles: {
                fontSize: 7,
                cellPadding: 2,
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
                valign: 'middle',
                halign: 'center'
            },
            headStyles: {
                fillColor: [247, 215, 66],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                halign: "center",
                fontSize: 7,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 32, halign: 'center' }, // S/N
                1: { cellWidth: 85, halign: 'left' },   // DESCRIPTION - más ancho (antes 58)
                2: { cellWidth: 38, halign: 'left' },   // MODEL
                3: { cellWidth: 28, halign: 'right' }   // PRICE
            },
            margin: { left: 20, right: 20 },
            tableWidth: 170, // Centrar la tabla
            didDrawPage: (data) => {
                this.doc.lastProductsTableY = data.cursor.y
            }
        })
    }
    
    addAdditionalCharges(charges) {
        const finalY = this.doc.lastProductsTableY + 3 // Reduced margin
        
        // Título
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(8)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("ADDITIONAL CHARGES", 20, finalY)

        // Crear tabla para cargos adicionales
        const chargesColumns = ["DESCRIPTION", "AMOUNT"]
        const chargesRows = charges.map(charge => [
            charge.description,
            `$${Number(charge.amount).toFixed(2)}`
        ])

        this.doc.autoTable({
            head: [chargesColumns],
            body: chargesRows,
            startY: finalY + 2,
            theme: "grid",
            styles: {
                fontSize: 7,
                cellPadding: 2,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [247, 215, 66],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                fontSize: 7
            },
            columnStyles: {
                0: { cellWidth: 140, halign: 'left' },
                1: { cellWidth: 30, halign: "right" }
            },
            margin: { left: 20, right: 20 },
            tableWidth: 170,
            didDrawPage: (data) => {
                this.doc.lastAdditionalChargesY = data.cursor.y
            }
        })
    }
    
    addTotals(saleData) {
        let startY

        if (this.doc.lastAdditionalChargesY) {
            startY = this.doc.lastAdditionalChargesY + 3 // Reduced margin
        } else {
            startY = this.doc.lastProductsTableY + 3 // Reduced margin
        }
        // Usar la misma posición X que la columna de precios de productos
        const totalsX = 190
        const labelsX = 140
        const lineHeight = 5 // Reduced line height

        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(9)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("SUMMARY", labelsX, startY)

        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(8)
        this.doc.setTextColor(0, 0, 0)

        let currentY = startY + lineHeight

        // Subtotal
        this.doc.text("Subtotal:", labelsX, currentY)
        this.doc.text(
            `$${saleData.amounts.subtotal.toFixed(2)}`,
            totalsX,
            currentY,
            { align: "right" }
        )
        currentY += lineHeight

        // Tax if applicable - ALWAYS 5.8% when applied
        if (saleData.amounts.taxRate > 0) {
            this.doc.text(`TAX (5.8%):`, labelsX, currentY)
            this.doc.text(
                `$${saleData.amounts.tax.toFixed(2)}`,
                totalsX,
                currentY,
                { align: "right" }
            )
            currentY += lineHeight
        }

        // Línea separadora más delgada
        this.doc.setDrawColor(200, 200, 200)
        this.doc.setLineWidth(0.2)
        this.doc.line(labelsX, currentY - 1.5, totalsX, currentY - 1.5)

        // Total
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(9)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("TOTAL:", labelsX, currentY + 1)
        this.doc.text(
            `$${saleData.amounts.total.toFixed(2)}`,
            totalsX,
            currentY + 1,
            { align: "right" }
        )

        this.doc.lastTotalsY = currentY + 6
    }
    
    addTermsAndConditions(terms) {
        let startY;
        
        if (this.doc.lastTotalsY) {
            startY = this.doc.lastTotalsY + 5; // Reduced margin
        } else {
            startY = this.doc.lastProductsTableY ? this.doc.lastProductsTableY + 10 : 180;
        }
        
        const pageHeight = this.doc.internal.pageSize.height;
        if (startY > pageHeight - 35) {
            this.doc.addPage();
            startY = 15;
        }
        
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(8);
        this.doc.setTextColor(10, 37, 64);
        this.doc.text("TERMS AND CONDITIONS", 20, startY);
        
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setLineWidth(0.2);
        this.doc.line(20, startY + 1.5, 65, startY + 1.5);
        
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(6.5);
        this.doc.setTextColor(80, 80, 80);
        
        const termsLines = this.doc.splitTextToSize(terms, 170);
        
        let yPosition = startY + 5;
        const lineHeight = 3.2; // Reduced line height
        
        for (let i = 0; i < termsLines.length; i++) {
            if (yPosition > pageHeight - 12) {
                this.doc.addPage();
                yPosition = 15;
            }
            
            this.doc.text(termsLines[i], 20, yPosition);
            yPosition += lineHeight;
        }
        
        this.doc.lastTermsY = yPosition;
    }
    
    addFooter() {
        const pages = this.doc.internal.getNumberOfPages()

        for (let i = 1; i <= pages; i++) {
            this.doc.setPage(i)

            const pageHeight = this.doc.internal.pageSize.height

            this.doc.setFontSize(6.5)
            this.doc.setFont("helvetica", "italic")
            this.doc.setTextColor(150, 150, 150)

            this.doc.text(
                "Thank you for your purchase",
                105,
                pageHeight - 6,
                { align: "center" }
            )

            this.doc.text(
                `Page ${i} of ${pages}`,
                190,
                pageHeight - 6,
                { align: "right" }
            )
        }
    }

}

export { PDFGenerator }