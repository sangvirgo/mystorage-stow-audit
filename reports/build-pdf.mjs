// Prints reports/submission.html to PDF with Chromium (the local TeX install has no working xelatex).
// Usage: pandoc submission.md -o submission.html --standalone --embed-resources --css report.css --resource-path=.:..
//        node build-pdf.mjs submission.html submission.pdf
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const [input, output] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`file://${resolve(input)}`);
  await page.pdf({
    path: output,
    format: 'A4',
    margin: { top: '15mm', bottom: '16mm', left: '15mm', right: '15mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#5b6678"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
} finally {
  await browser.close();
}
