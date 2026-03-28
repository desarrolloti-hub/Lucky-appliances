class PDFGenerator {

    constructor() {
        this.doc = null
        this.saleNumber = null
    }

    async generateSalePDF(saleData, products) {
        const { jsPDF } = window.jspdf

        this.doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "letter"
        })

        // Guardar número de venta para usarlo en el footer
        this.saleNumber = saleData.saleNumber

        // Usar el evento didDrawPage para agregar header y footer en cada página
        this.doc.autoTable = this.doc.autoTable || function() {}
        
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

        // Agregar footer en todas las páginas
        this.addFooter()

        return this.doc.output("blob")
    }
    
    async addHeader(saleData) {
        // Logo a la derecha
        try {
            const logoPath = '/assets/icons/luckyPDF2.png'
            const logoImage = await this.loadImage(logoPath)
            this.doc.addImage(logoImage, 'PNG', 140, 3, 55, 55)
        } catch (error) {
            console.error('Error loading logo:', error)
            this.doc.setFont("helvetica", "bold")
            this.doc.setFontSize(10)
            this.doc.setTextColor(10, 37, 64)
            this.doc.text("LUCKY APPLIANCES", 160, 20)
        }

        // Información de la empresa - color azul
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

        // Título centrado - color azul
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

        // Línea separadora
        this.doc.setDrawColor(200, 200, 200)
        this.doc.setLineWidth(0.3)
        this.doc.line(20, 70, 190, 70)
        
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
        let startY = this.doc.headerEndY + 2
        
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(9)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("CUSTOMER:", 20, startY)
        
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(8)
        this.doc.setTextColor(0, 0, 0)
        
        const customerName = saleData.customer.name || "N/A"
        const customerPhone = saleData.customer.phone || "N/A"
        const customerEmail = saleData.customer.email || "N/A"
        const customerAddress = saleData.customer.address || "N/A"
        
        const customerInfo = `Name: ${customerName} | Phone: ${customerPhone} | Email: ${customerEmail} | Address: ${customerAddress}`
        const customerLines = this.doc.splitTextToSize(customerInfo, 165)
        
        this.doc.text(customerLines, 20, startY + 5)
        
        const customerLinesCount = customerLines.length
        this.doc.lastCustomerInfoY = startY + 5 + (customerLinesCount * 4) + 3
    }

    addProductsTable(products) {
        const columns = [
            "S/N",
            "DESCRIPTION",
            "MODEL",
            "PRICE"
        ]

        const rows = []

        products.forEach(product => {
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
                fillColor: [10, 37, 64], // Azul oscuro (#0a2540)
                textColor: [255, 255, 255],
                fontStyle: "bold",
                halign: "center",
                fontSize: 7,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 32, halign: 'center' },
                1: { cellWidth: 85, halign: 'left' },
                2: { cellWidth: 38, halign: 'left' },
                3: { cellWidth: 28, halign: 'right' }
            },
            margin: { left: 20, right: 20 },
            tableWidth: 170,
            didDrawPage: (data) => {
                this.doc.lastProductsTableY = data.cursor.y
            }
        })
    }
    
    addAdditionalCharges(charges) {
        const finalY = this.doc.lastProductsTableY + 3
        
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(8)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("ADDITIONAL CHARGES", 20, finalY)

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
                fillColor: [10, 37, 64], // Azul oscuro (#0a2540)
                textColor: [255, 255, 255],
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
            startY = this.doc.lastAdditionalChargesY + 3
        } else {
            startY = this.doc.lastProductsTableY + 3
        }
        
        const totalsX = 190
        const labelsX = 140
        const lineHeight = 5

        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(9)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("SUMMARY", labelsX, startY)

        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(8)
        this.doc.setTextColor(0, 0, 0)

        let currentY = startY + lineHeight

        // Products Subtotal
        this.doc.text("Products Subtotal:", labelsX, currentY)
        this.doc.text(
            `$${saleData.amounts.productsSubtotal.toFixed(2)}`,
            totalsX,
            currentY,
            { align: "right" }
        )
        currentY += lineHeight

        // Discount if applied
        if (saleData.amounts.discountValue > 0) {
            this.doc.setTextColor(76, 175, 80)
            this.doc.text("Discount:", labelsX, currentY)
            this.doc.text(
                `-$${saleData.amounts.discountValue.toFixed(2)}`,
                totalsX,
                currentY,
                { align: "right" }
            )
            currentY += lineHeight
            
            // Products after discount
            const discountedProducts = saleData.amounts.productsSubtotal - saleData.amounts.discountValue
            this.doc.setTextColor(10, 37, 64)
            this.doc.text("Products after discount:", labelsX, currentY)
            this.doc.text(
                `$${discountedProducts.toFixed(2)}`,
                totalsX,
                currentY,
                { align: "right" }
            )
            currentY += lineHeight
        }

        // Additional Charges
        if (saleData.additionalCharges && saleData.additionalCharges.length > 0) {
            this.doc.setTextColor(0, 0, 0)
            saleData.additionalCharges.forEach(charge => {
                this.doc.text(charge.description + ":", labelsX, currentY)
                this.doc.text(
                    `$${charge.amount.toFixed(2)}`,
                    totalsX,
                    currentY,
                    { align: "right" }
                )
                currentY += lineHeight
            })
        }

        // Subtotal (products after discount + charges)
        this.doc.setTextColor(0, 0, 0)
        this.doc.setFont("helvetica", "bold")
        this.doc.text("Subtotal:", labelsX, currentY)
        this.doc.text(
            `$${saleData.amounts.subtotal.toFixed(2)}`,
            totalsX,
            currentY,
            { align: "right" }
        )
        this.doc.setFont("helvetica", "normal")
        currentY += lineHeight

        // Tax - with correct rate (8.38%)
        if (saleData.amounts.taxRate > 0) {
            this.doc.text(`TAX (8.38%):`, labelsX, currentY)
            this.doc.text(
                `$${saleData.amounts.tax.toFixed(2)}`,
                totalsX,
                currentY,
                { align: "right" }
            )
            currentY += lineHeight
        }

        // Separator line
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
            startY = this.doc.lastTotalsY + 5
        } else {
            startY = this.doc.lastProductsTableY ? this.doc.lastProductsTableY + 10 : 180
        }
        
        const pageHeight = this.doc.internal.pageSize.height
        if (startY > pageHeight - 35) {
            this.doc.addPage()
            startY = 15
        }
        
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(8)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("TERMS AND CONDITIONS", 20, startY)
        
        this.doc.setDrawColor(200, 200, 200)
        this.doc.setLineWidth(0.2)
        this.doc.line(20, startY + 1.5, 65, startY + 1.5)
        
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(6.5)
        this.doc.setTextColor(80, 80, 80)
        
        const termsLines = this.doc.splitTextToSize(terms, 170)
        
        let yPosition = startY + 5
        const lineHeight = 3.2
        
        for (let i = 0; i < termsLines.length; i++) {
            if (yPosition > pageHeight - 12) {
                this.doc.addPage()
                yPosition = 15
            }
            
            this.doc.text(termsLines[i], 20, yPosition)
            yPosition += lineHeight
        }
        
        this.doc.lastTermsY = yPosition
    }
    
    addFooter() {
        const pages = this.doc.internal.getNumberOfPages()

        for (let i = 1; i <= pages; i++) {
            this.doc.setPage(i)

            const pageHeight = this.doc.internal.pageSize.height

            this.doc.setFontSize(6.5)
            this.doc.setFont("helvetica", "italic")
            this.doc.setTextColor(150, 150, 150)

            // Mensaje de agradecimiento centrado
            this.doc.text(
                "Thank you for your purchase",
                105,
                pageHeight - 6,
                { align: "center" }
            )

            // Número de página a la derecha
            this.doc.text(
                `Page ${i} of ${pages}`,
                190,
                pageHeight - 6,
                { align: "right" }
            )

            // Número de venta a la izquierda en el footer
            if (this.saleNumber) {
                this.doc.setFont("helvetica", "normal")
                this.doc.setTextColor(100, 100, 100)
                this.doc.text(
                    `Sale #: ${this.saleNumber}`,
                    20,
                    pageHeight - 6,
                    { align: "left" }
                )
            }
        }
    }

}

export { PDFGenerator }