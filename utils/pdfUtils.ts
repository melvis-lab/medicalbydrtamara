
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Lesson } from '../types';

export const generateAndSharePdf = async (lesson: Lesson, containerId: string = "lesson-print-container") => {
  const originalElement = document.getElementById(containerId);
  if (!originalElement) {
    console.error("Element not found:", containerId);
    return;
  }

  // 1. Create a "Print Clone" off-screen to enforce A4 formatting
  const clone = originalElement.cloneNode(true) as HTMLElement;
  clone.style.width = '800px'; // Fixed A4 width (approx)
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.backgroundColor = 'white';
  clone.style.color = 'black';
  clone.id = 'print-clone';
  
  // Enforce serif fonts for print look
  clone.style.fontFamily = '"Playfair Display", Georgia, serif';
  
  // Clean up styles for print
  const headers = clone.querySelectorAll('h1, h2, h3');
  headers.forEach((h) => {
    (h as HTMLElement).style.color = '#000';
    (h as HTMLElement).style.fontFamily = '"Playfair Display", serif';
  });

  document.body.appendChild(clone);

  // 2. Smart Pagination: Insert spacers to prevent cutting images/text
  smartPaginate(clone);

  try {
    // 3. Capture with html2canvas
    // Wait a moment for images to render in the clone
    await new Promise(r => setTimeout(r, 500));

    const canvas = await html2canvas(clone, {
      scale: 2, // 2x scale for Retina-like sharpness
      useCORS: true,
      logging: false,
      windowWidth: 800
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    
    let heightLeft = imgHeight;
    let position = 0;

    // First page
    doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Subsequent pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 4. Native Sharing (WhatsApp/Viber)
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `${lesson.content.title.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: lesson.content.title,
        text: 'Medicinska lekcija generisana pomoću MediBuilder AI.',
      });
    } else {
      // Fallback: Download
      doc.save(`${lesson.content.title}.pdf`);
    }

  } catch (err) {
    console.error("PDF Gen Error:", err);
    throw err;
  } finally {
    document.body.removeChild(clone);
  }
};

// Helper: Insert spacers to push content to next page if it crosses A4 boundary
const smartPaginate = (element: HTMLElement) => {
  const A4_HEIGHT_PX = 1123; // Approx A4 height at 96dpi (width 794px). 
  // Since we set width to 800px, we can estimate height ratio.
  // Let's use a safe height slightly less than full A4 to account for margins
  const PAGE_HEIGHT = 1050; 
  
  let currentHeight = 0;
  
  const sections = Array.from(element.children) as HTMLElement[];
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const rect = section.getBoundingClientRect();
    const sectionHeight = rect.height;
    
    if (sectionHeight === 0) continue;

    // Check if this section crosses a page boundary
    const startY = currentHeight;
    const endY = currentHeight + sectionHeight;
    
    const startPage = Math.floor(startY / PAGE_HEIGHT);
    const endPage = Math.floor(endY / PAGE_HEIGHT);

    if (startPage !== endPage) {
      // It crosses a break.
      // If the section is smaller than a page, push it to the next page.
      if (sectionHeight < PAGE_HEIGHT) {
        const spacerHeight = (endPage * PAGE_HEIGHT) - startY;
        // Or simply: push to next page start
        const pushDown = (startPage + 1) * PAGE_HEIGHT - startY;
        
        section.style.marginTop = `${pushDown}px`;
        currentHeight += pushDown;
      }
      // If section is huge (larger than a page), we can't do much but let it cut, 
      // or try to break it internally (complex). For now, we push headers/images.
    }
    
    currentHeight += sectionHeight;
  }
};
