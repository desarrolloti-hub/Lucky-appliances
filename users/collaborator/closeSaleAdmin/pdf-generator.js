// pdf-generator.js
// Professional PDF generator for sales

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
        this.addSellerAndCustomerInfo(saleData)
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


    // ================================
    // HEADER
    // ================================

    async addHeader(saleData) {
        // Línea superior azul más gruesa
        this.doc.setFillColor(10, 37, 64)
        this.doc.rect(0, 0, 216, 12, "F")

        // Logo a la derecha - ajustado para no superponerse
        try {
            const logoPath = '/assets/icons/logo Lucky Apliances.png'
            const logoImage = await this.loadImage(logoPath)
            this.doc.addImage(logoImage, 'PNG', 140, 5, 75, 75)
        } catch (error) {
            console.error('Error loading logo:', error)
            // Si no hay logo, mostrar texto alternativo
            this.doc.setFont("helvetica", "bold")
            this.doc.setFontSize(12)
            this.doc.setTextColor(10, 37, 64)
            this.doc.text("LUCKY APPLIANCES", 160, 25)
        }

        // Información de la empresa (izquierda) - ahora más abajo para evitar superposición
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(14)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("LUCKY APPLIANCES, LLC", 20, 25)

        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(9)
        this.doc.setTextColor(80, 80, 80)
        this.doc.text("3990 WEST RUSELL ROAD", 20, 33)
        this.doc.text("LAS VEGAS NEVADA, 89118", 20, 39)
        this.doc.text("SUIT 6", 20, 45)
        this.doc.text("PHONE: 725 300 1480", 20, 51)

        // Título centrado
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(24)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("INVOICE", 105, 70, { align: "center" })

        // Número de factura y fecha centrados
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(11)
        this.doc.setTextColor(0, 0, 0)
        
        const date = new Date().toLocaleDateString("en-US")
        const invoiceInfo = `No. ${saleData.saleNumber}     DATE: ${date}`
        this.doc.text(invoiceInfo, 105, 80, { align: "center" })

        // Línea separadora
        this.doc.setDrawColor(200, 200, 200)
        this.doc.setLineWidth(0.5)
        this.doc.line(20, 88, 190, 88)
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


    // ================================
    // SELLER AND CUSTOMER INFO (SIDE BY SIDE)
    // ================================

    addSellerAndCustomerInfo(saleData) {
        // Customer Info (izquierda)
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(11)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("BILL TO:", 20, 100)

        this.doc.setFont("helvetica", "normal")
        this.doc.setTextColor(0, 0, 0)
        this.doc.setFontSize(10)
        
        let yPos = 108
        this.doc.text(`Name: ${saleData.customer.name || "N/A"}`, 20, yPos)
        this.doc.text(`Phone: ${saleData.customer.phone || "N/A"}`, 20, yPos + 6)
        this.doc.text(`Email: ${saleData.customer.email || "N/A"}`, 20, yPos + 12)

        const address = saleData.customer.address || "N/A"
        const addressLines = this.doc.splitTextToSize(`Address: ${address}`, 80)
        this.doc.text(addressLines, 20, yPos + 18)

        // Seller Info (derecha)
        this.doc.setFont("helvetica", "bold")
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("SOLD BY:", 115, 100)

        this.doc.setFont("helvetica", "normal")
        this.doc.setTextColor(0, 0, 0)
        this.doc.text(`Name: ${saleData.seller.displayName || "N/A"}`, 115, yPos)
        this.doc.text(`Email: ${saleData.seller.email || "N/A"}`, 115, yPos + 6)
        this.doc.text(`Role: ${saleData.seller.role || "N/A"}`, 115, yPos + 12)
    }


    // ================================
    // PRODUCTS TABLE (AMARILLA)
    // ================================

    addProductsTable(products) {
        const columns = [
            "SERIAL NUMBER",
            "MODEL",
            "SKU",
            "PRICE"
        ]

        const rows = []

        products.forEach(product => {
            rows.push([
                product.serialNumber || "N/A",
                product.model || "N/A",
                product.sku || "N/A",
                `$${Number(product.price).toFixed(2)}`
            ])
        })

        this.doc.autoTable({
            head: [columns],
            body: rows,
            startY: 150,
            theme: "grid",
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [247, 215, 66], // Color amarillo #f5d742
                textColor: [0, 0, 0],
                fontStyle: "bold",
                halign: "center"
            },
            columnStyles: {
                0: { cellWidth: 45 },
                1: { cellWidth: 55 },
                2: { cellWidth: 40 },
                3: { cellWidth: 30, halign: "right" }
            },
            didDrawPage: (data) => {
                this.doc.lastProductsTableY = data.cursor.y
            }
        })
    }


    // ================================
    // ADDITIONAL CHARGES TABLE (AMARILLA)
    // ================================

    addAdditionalCharges(charges) {
        const finalY = this.doc.lastProductsTableY + 10

        // Título
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(11)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("ADDITIONAL CHARGES", 20, finalY)

        // Crear tabla para cargos adicionales con color amarillo
        const chargesColumns = ["DESCRIPTION", "AMOUNT"]
        const chargesRows = charges.map(charge => [
            charge.description,
            `$${Number(charge.amount).toFixed(2)}`
        ])

        this.doc.autoTable({
            head: [chargesColumns],
            body: chargesRows,
            startY: finalY + 5,
            theme: "grid",
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [247, 215, 66], // Color amarillo #f5d742
                textColor: [0, 0, 0],
                fontStyle: "bold"
            },
            columnStyles: {
                0: { cellWidth: 140 },
                1: { cellWidth: 30, halign: "right" }
            },
            didDrawPage: (data) => {
                this.doc.lastAdditionalChargesY = data.cursor.y
            }
        })
    }


    // ================================
    // TOTALS (ALINEADO CON PRODUCTOS)
    // ================================

    addTotals(saleData) {
        let startY

        if (this.doc.lastAdditionalChargesY) {
            startY = this.doc.lastAdditionalChargesY + 10
        } else {
            startY = this.doc.lastProductsTableY + 10
        }

        // Usar la misma posición X que la columna de precios de productos
        const totalsX = 190 // Alineado con el borde derecho de la columna PRICE
        const labelsX = 140 // Posición para las etiquetas
        const lineHeight = 7

        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(11)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("SUMMARY", labelsX, startY)

        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(10)
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

        // Tax if applicable
        if (saleData.amounts.taxRate > 0) {
            const taxPercent = (saleData.amounts.taxRate * 100).toFixed(1)
            this.doc.text(`TAX (${taxPercent}%):`, labelsX, currentY)
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
        this.doc.line(labelsX, currentY - 2, totalsX, currentY - 2)

        // Total
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(11)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("TOTAL:", labelsX, currentY + 2)
        this.doc.text(
            `$${saleData.amounts.total.toFixed(2)}`,
            totalsX,
            currentY + 2,
            { align: "right" }
        )

        this.doc.lastTotalsY = currentY + 10
    }

    // ================================
    // TERMS AND CONDITIONS
    // ================================

    addTermsAndConditions(terms) {
        let startY;
        
        if (this.doc.lastTotalsY) {
            startY = this.doc.lastTotalsY + 15;
        } else {
            startY = this.doc.lastProductsTableY ? this.doc.lastProductsTableY + 30 : 200;
        }
        
        const pageHeight = this.doc.internal.pageSize.height;
        if (startY > pageHeight - 50) {
            this.doc.addPage();
            startY = 30;
        }
        
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(10);
        this.doc.setTextColor(10, 37, 64);
        this.doc.text("TERMS AND CONDITIONS", 20, startY);
        
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setLineWidth(0.2);
        this.doc.line(20, startY + 2, 70, startY + 2);
        
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(8);
        this.doc.setTextColor(80, 80, 80);
        
        const termsLines = this.doc.splitTextToSize(terms, 170);
        
        let yPosition = startY + 8;
        const lineHeight = 4;
        
        for (let i = 0; i < termsLines.length; i++) {
            if (yPosition > pageHeight - 20) {
                this.doc.addPage();
                yPosition = 30;
            }
            
            this.doc.text(termsLines[i], 20, yPosition);
            yPosition += lineHeight;
        }
        
        this.doc.lastTermsY = yPosition;
    }


    // ================================
    // FOOTER
    // ================================

    addFooter() {
        const pages = this.doc.internal.getNumberOfPages()

        for (let i = 1; i <= pages; i++) {
            this.doc.setPage(i)

            const pageHeight = this.doc.internal.pageSize.height

            this.doc.setFontSize(8)
            this.doc.setFont("helvetica", "italic")
            this.doc.setTextColor(150, 150, 150)

            this.doc.text(
                "Thank you for your purchase",
                105,
                pageHeight - 10,
                { align: "center" }
            )

            this.doc.text(
                `Page ${i} of ${pages}`,
                190,
                pageHeight - 10,
                { align: "right" }
            )
        }
    }

}

export { PDFGenerator }