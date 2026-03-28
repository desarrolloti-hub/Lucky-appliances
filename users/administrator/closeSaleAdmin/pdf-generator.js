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
        // Logo
        let logoLoaded = false
        const logoPaths = [
            '/assets/icons/luckyPDF2.png',
            '/assets/icons/luckyPDF2.jpg',
            '/assets/icons/Logo-Lucky-Apliances.png',
            '/assets/icons/Logo Lucky Apliances.png',
            '/assets/images/logo.png',
            '../assets/icons/luckyPDF2.png',
            '../assets/icons/Logo-Lucky-Apliances.png'
        ]
        
        for (const logoPath of logoPaths) {
            try {
                const logoImage = await this.loadImage(logoPath)
                this.doc.addImage(logoImage, 'PNG', 140, 3, 55, 55)
                logoLoaded = true
                console.log('Logo loaded from:', logoPath)
                break
            } catch (error) {
                // Continuar intentando con la siguiente ruta
            }
        }
        
        if (!logoLoaded) {
            console.warn('No logo found, using text fallback')
            this.doc.setFont("helvetica", "bold")
            this.doc.setFontSize(13)
            this.doc.setTextColor(10, 37, 64)
            this.doc.text("LUCKY APPLIANCES", 160, 18)
        }

        // Información de la empresa
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(11)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("LUCKY APPLIANCES, LLC", 20, 15)

        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(9)
        this.doc.setTextColor(60, 60, 60)
        this.doc.text("3990 WEST RUSELL ROAD", 20, 21)
        this.doc.text("LAS VEGAS NEVADA, 89118", 20, 26)
        this.doc.text("SUIT 6", 20, 31)
        this.doc.text("PHONE: 725 300 1480, 702 910-0979", 20, 36)
        
        // WEB con enlace
        this.doc.setTextColor(10, 37, 64)
        this.doc.textWithLink = function(text, x, y, url) {
            this.text(text, x, y)
            const textWidth = this.getStringUnitWidth(text) * this.internal.getFontSize() / this.internal.scaleFactor
            this.setDrawColor(10, 37, 64)
            this.setLineWidth(0.2)
            this.line(x, y + 0.5, x + textWidth, y + 0.5)
            this.link(x, y - 3, textWidth, 4, { url: url })
        }
        this.doc.setFontSize(9)
        this.doc.textWithLink("WEB: lucky-appliances.com", 20, 41, "https://lucky-appliances.com")
        this.doc.setTextColor(60, 60, 60)

        // Título centrado
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(20)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("INVOICE", 105, 55, { align: "center" })

        // Número de factura y fecha centrados
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(11)
        this.doc.setTextColor(60, 60, 60)
        
        const date = new Date().toLocaleDateString("en-US")
        const invoiceInfo = `${saleData.saleNumber}     DATE: ${date}`
        this.doc.text(invoiceInfo, 105, 63, { align: "center" })

        // Línea separadora
        this.doc.setDrawColor(200, 200, 200)
        this.doc.setLineWidth(0.5)
        this.doc.line(20, 69, 190, 69)
        
        this.doc.headerEndY = 71
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
            img.src = url
        })
    }
    
    addCustomerInfo(saleData) {
        let startY = this.doc.headerEndY + 1
        
        // Título CUSTOMER
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(10)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("CUSTOMER:", 20, startY)
        
        // Información del cliente
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(9)
        this.doc.setTextColor(60, 60, 60)
        
        const customerName = saleData.customer.name || "N/A"
        const customerPhone = saleData.customer.phone || "N/A"
        const customerEmail = saleData.customer.email || "N/A"
        const customerAddress = saleData.customer.address || "N/A"
        
        const customerInfo = `Name: ${customerName} | Phone: ${customerPhone} | Email: ${customerEmail} | Address: ${customerAddress}`
        const customerLines = this.doc.splitTextToSize(customerInfo, 165)
        
        this.doc.text(customerLines, 20, startY + 4)
        
        const customerLinesCount = customerLines.length
        this.doc.lastCustomerInfoY = startY + 4 + (customerLinesCount * 4) + 1
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

        const startY = (this.doc.lastCustomerInfoY || 80) + 1

        this.doc.autoTable({
            head: [columns],
            body: rows,
            startY: startY,
            theme: "grid",
            styles: {
                fontSize: 10,
                cellPadding: 2,      // Reducido de 3 a 2
                lineColor: [180, 180, 180],
                lineWidth: 0.2,
                valign: 'middle',
                halign: 'center',
                textColor: [40, 40, 40]
            },
            headStyles: {
                fillColor: [10, 37, 64],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                halign: "center",
                fontSize: 8,
                cellPadding: 2,      // Reducido de 3 a 2 (misma altura que contenido)
                minCellHeight: 4     // Altura mínima para que se vea bien
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
        const finalY = this.doc.lastProductsTableY + 4
        
        // Título
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(9)
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
            startY: finalY + 3,
            theme: "grid",
            styles: {
                fontSize: 10,
                cellPadding: 2,      // Reducido de 3 a 2
                lineColor: [180, 180, 180],
                lineWidth: 0.2,
                textColor: [40, 40, 40]
            },
            headStyles: {
                fillColor: [10, 37, 64],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 8,
                cellPadding: 2,      // Reducido de 3 a 2
                minCellHeight: 4
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
        const lineHeight = 5.5

        // Título SUMMARY
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(10)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("SUMMARY", labelsX, startY)

        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(9)
        this.doc.setTextColor(50, 50, 50)

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
            this.doc.setTextColor(50, 50, 50)
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
        this.doc.setTextColor(50, 50, 50)
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
        this.doc.setDrawColor(180, 180, 180)
        this.doc.setLineWidth(0.3)
        this.doc.line(labelsX, currentY - 2, totalsX, currentY - 2)

        // Total
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(11)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("TOTAL:", labelsX, currentY + 1)
        this.doc.text(
            `$${saleData.amounts.total.toFixed(2)}`,
            totalsX,
            currentY + 1,
            { align: "right" }
        )

        this.doc.lastTotalsY = currentY + 7
    }
    
    addTermsAndConditions(terms) {
        let startY;
        
        if (this.doc.lastTotalsY) {
            startY = this.doc.lastTotalsY + 5
        } else {
            startY = this.doc.lastProductsTableY ? this.doc.lastProductsTableY + 10 : 185
        }
        
        const pageHeight = this.doc.internal.pageSize.height
        if (startY > pageHeight - 40) {
            this.doc.addPage()
            startY = 18
        }
        
        // Título TERMS
        this.doc.setFont("helvetica", "bold")
        this.doc.setFontSize(9)
        this.doc.setTextColor(10, 37, 64)
        this.doc.text("TERMS AND CONDITIONS", 20, startY)
        
        this.doc.setDrawColor(180, 180, 180)
        this.doc.setLineWidth(0.3)
        this.doc.line(20, startY + 2, 72, startY + 2)
        
        // Contenido de términos
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(8)
        this.doc.setTextColor(60, 60, 60)
        
        const termsLines = this.doc.splitTextToSize(terms, 170)
        
        let yPosition = startY + 6
        const lineHeight = 4.2
        
        for (let i = 0; i < termsLines.length; i++) {
            if (yPosition > pageHeight - 15) {
                this.doc.addPage()
                yPosition = 18
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

            // Footer
            this.doc.setFontSize(8)
            this.doc.setFont("helvetica", "italic")
            this.doc.setTextColor(100, 100, 100)

            // Mensaje de agradecimiento centrado
            this.doc.text(
                "Thank you for your purchase",
                105,
                pageHeight - 8,
                { align: "center" }
            )

            // Número de página a la derecha
            this.doc.text(
                `Page ${i} of ${pages}`,
                190,
                pageHeight - 8,
                { align: "right" }
            )

            // Número de venta a la izquierda en el footer
            if (this.saleNumber) {
                this.doc.setFont("helvetica", "normal")
                this.doc.setTextColor(80, 80, 80)
                this.doc.text(
                    `Sale #: ${this.saleNumber}`,
                    20,
                    pageHeight - 8,
                    { align: "left" }
                )
            }
        }
    }

}

export { PDFGenerator }