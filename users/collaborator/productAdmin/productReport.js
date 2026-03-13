// productReport.js - Final Corporate PDF Report with Full-Height Logo
// Developed by RSI ENTERPRISE

class ProductReportGenerator {
    constructor() {
        this.doc = null;
        this.pageWidth = 297; // landscape A4 width
        this.pageHeight = 210; // landscape A4 height
        this.margin = 15;
        this.contentWidth = this.pageWidth - (2 * this.margin);
    }

    async generateStockReport(products, options = {}) {
        const defaults = {
            title: "Inventory Report",
            subtitle: "Lucky Appliances | Product Stock Overview",
            includeUnits: true,
            includePrices: true,
            logoPath: "/assets/icons/Logo Lucky Apliances.png"
        };
        const config = { ...defaults, ...options };

        try {
            const PDFLib = window.jspdf?.jsPDF || window.jsPDF;
            if (!PDFLib) throw new Error("jsPDF library not loaded");

            this.doc = new PDFLib({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });

            const logoImg = await this.loadImage(config.logoPath);

            this.addHeader(config, logoImg);
            this.addSummary(products);
            this.addProductsTable(products, config, logoImg);
            this.addFooter(config, logoImg);

            const fileName = `Inventory_Report_${this.getFormattedDate()}.pdf`;
            this.doc.save(fileName);
        } catch (error) {
            console.error("Error generating report:", error);
            throw error;
        }
    }

    async loadImage(path) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = path;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });
    }

    addHeader(config, logoImg) {
        const doc = this.doc;
        const headerHeight = 18; // height of blue header bar

        // Header background (navy)
        doc.setFillColor(10, 37, 64);
        doc.rect(0, 0, this.pageWidth, headerHeight + 8, "F");

        // Logo (square, full height of header)
        if (logoImg) {
            const logoSize = headerHeight + 6; // slightly larger than bar height
            doc.addImage(logoImg, "PNG", this.margin, 1, logoSize, logoSize);
        }

        // Title (center)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(245, 215, 66);
        doc.text(config.title, this.pageWidth / 2, 9, { align: "center" });

        // Subtitle
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(config.subtitle, this.pageWidth / 2, 14, { align: "center" });

        // Date (right)
        const dateStr = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(`Generated on: ${dateStr}`, this.pageWidth - this.margin, 9, { align: "right" });
    }

    addSummary(products) {
        const doc = this.doc;
        let y = 28;

        const totalProducts = products.length;
        const totalUnits = products.reduce((sum, p) => sum + (p.unidades?.length || 0), 0);
        const totalValue = products.reduce(
            (sum, p) => sum + ((p.nuestroPrecio || 0) * (p.unidades?.length || 0)),
            0
        );
        const inStock = products.filter(p => (p.unidades?.length || 0) > 0).length;
        const outStock = totalProducts - inStock;

        const stats = [
            { label: "Total Products", value: totalProducts },
            { label: "Total Units", value: totalUnits },
            { label: "Inventory Value", value: this.formatCurrency(totalValue) },
            { label: "Products In Stock", value: inStock },
            { label: "Products Out of Stock", value: outStock }
        ];

        const boxWidth = 50;
        const boxHeight = 20;
        const gap = 7;
        const totalWidth = stats.length * boxWidth + (stats.length - 1) * gap;
        let x = (this.pageWidth - totalWidth) / 2;

        stats.forEach((stat) => {
            doc.setDrawColor(245, 215, 66);
            doc.setLineWidth(0.8);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, "FD");

            doc.setFont("helvetica", "bold");
            doc.setTextColor(10, 37, 64);
            doc.setFontSize(11);
            doc.text(String(stat.value), x + 5, y + 9);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(90);
            doc.text(stat.label, x + 5, y + 15);

            x += boxWidth + gap;
        });
    }

    addProductsTable(products, config, logoImg) {
        const doc = this.doc;
        const columns = [
            "Model", "SKU", "Internal ID", "Brand", "Category", "Provider",
            ...(config.includeUnits ? ["Units"] : []),
            ...(config.includePrices ? ["Our Price", "Competitor Price"] : []),
            "Location", "Stock Status"
        ];

        const tableData = products.map(p => [
            p.Model || "N/A",
            p.SKU || "N/A",
            p.idInterno || "N/A",
            p.getBrandName?.() || "N/A",
            p.getCategoryName?.() || "N/A",
            p.getProviderName?.() || "N/A",
            ...(config.includeUnits ? [p.unidades?.length || 0] : []),
            ...(config.includePrices ? [this.formatCurrency(p.nuestroPrecio || 0), this.formatCurrency(p.precioCompetencia || 0)] : []),
            p.Location || "N/A",
            (p.unidades?.length || 0) > 0 ? "In Stock" : "Out of Stock"
        ]);

        const startY = 55;

        if (doc.autoTable) {
            doc.autoTable({
                head: [columns],
                body: tableData,
                startY,
                margin: { left: this.margin, right: this.margin },
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    lineColor: [230, 230, 230],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [10, 37, 64],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    halign: "center"
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 250]
                },
                didDrawPage: (data) => {
                    this.addHeader(config, logoImg);
                    this.addFooter(config, logoImg);
                }
            });
        }
    }

    addFooter(config, logoImg) {
        const doc = this.doc;
        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const y = this.pageHeight - 8;

            // Footer background (navy)
            doc.setFillColor(10, 37, 64);
            doc.rect(0, this.pageHeight - 12, this.pageWidth, 12, "F");

            // Page number
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(245, 215, 66);
            doc.text(`Page ${i} of ${pageCount}`, this.margin, y);

            // Center text
            const footerText = "Report generated by Lucky Appliances | Developed by RSI ENTERPRISE";
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text(footerText, this.pageWidth / 2, y, { align: "center" });

            // Redraw logo full height on every page
            if (logoImg) {
                const logoSize = 24;
                doc.addImage(logoImg, "PNG", this.margin, 1, logoSize, logoSize);
            }
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(value || 0);
    }

    getFormattedDate() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    async generateQuickReport(products) {
        return this.generateStockReport(products, {
            title: "Quick Inventory Report",
            subtitle: "Lucky Appliances | Summary of Product Stock"
        });
    }

    async generateDetailedReport(products) {
        return this.generateStockReport(products, {
            title: "Detailed Inventory Report",
            subtitle: "Lucky Appliances | Complete Product Stock Overview"
        });
    }
}

window.ProductReportGenerator = ProductReportGenerator;