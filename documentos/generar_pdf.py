"""Script para generar PDFs de prueba para MedGuard AI."""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def create_good_pdf(output_path):
    """Genera un PDF con consentimiento completo (bueno)."""
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    
    # Título
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 2*cm, "HOSPITAL METROPOLITANO DE ALTA COMPLEJIDAD")
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 3*cm, "SERVICIO DE CIRUGÍA GENERAL Y DIGESTIVA")
    c.drawCentredString(width / 2, height - 3.5*cm, "DOCUMENTO DE CONSENTIMIENTO INFORMADO: COLECISTECTOMÍA LAPAROSCÓPICA")
    
    # Datos del paciente
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, height - 5*cm, "DATOS DEL PACIENTE:")
    c.setFont("Helvetica", 10)
    text = c.beginText(2*cm, height - 6*cm)
    text.textLine("Nombre: Juan Pérez Rodríguez")
    text.textLine("Documento: 12345678-9")
    text.textLine("Fecha Nacimiento: 15/05/1978")
    text.textLine("Edad: 46 años")
    text.textLine("Historia Clínica: HC-2024-001234")
    c.drawText(text)
    
    # Datos del procedimiento
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, height - 12*cm, "DATOS DEL PROCEDIMIENTO:")
    c.setFont("Helvetica", 10)
    text = c.beginText(2*cm, height - 13*cm)
    text.textLine("Fecha: 18/10/2024")
    text.textLine("Procedimiento: Colecistectomía Laparoscópica")
    text.textLine("Finalidad: Tratamiento de Colelitiasis sintomática recurrente")
    c.drawText(text)
    
    # Riesgos y complicaciones
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, height - 18*cm, "RIESGOS Y COMPLICACIONES:")
    c.setFont("Helvetica", 9)
    text = c.beginText(2*cm, height - 19*cm)
    text.textLine("- Hemorragia intraoperatoria (1-3%)")
    text.textLine("- Lesión de vía biliar principal (2-5%)")
    text.textLine("- Infección de herida quirúrgica (3-5%)")
    text.textLine("- Necesidad de conversión a cirugía abierta (5-10%)")
    text.textLine("- Dolor postoperatorio, náuseas, vómitos")
    c.drawText(text)
    
    # Alternativas
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, height - 27*cm, "ALTERNATIVAS AL PROCEDIMIENTO:")
    c.setFont("Helvetica", 9)
    text = c.beginText(2*cm, height - 28*cm)
    text.textLine("1. Manejo conservador (dietas, medicación)")
    text.textLine("2. Litotripsia extracorpórea")
    text.textLine("3. Medicación farmacológica a largo plazo")
    text.textLine("Riesgo: Recurrencia >50% en 5 años")
    c.drawText(text)
    
    # Firma del paciente
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2*cm, 10*cm, "Firma del Paciente:")
    c.drawString(2*cm, 8*cm, "Juan Pérez Rodríguez")
    c.drawString(2*cm, 7.5*cm, "Documento: 12345678-9")
    
    # Firma del médico
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2*cm, 5*cm, "Firma del Médico Cirujano:")
    c.drawString(2*cm, 4*cm, "Dr. Roberto Valdés")
    c.drawString(2*cm, 3.5*cm, "Cédula: 48102")
    
    # Firma del anestesiólogo
    c.drawString(2*cm, 2*cm, "Firma del Anestesiólogo:")
    c.drawString(2*cm, 1.5*cm, "Dr. Carlos Méndez")
    c.drawString(2*cm, 1*cm, "Cédula: 89456")
    
    c.save()
    print(f"PDF bueno creado: {output_path}")

def create_bad_pdf(output_path):
    """Genera un PDF con consentimiento incompleto (malo - para alertas)."""
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    
    # Título
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width / 2, height - 2*cm, "HOSPITAL CLÍNICO")
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, height - 3*cm, "SERVICIO DE CIRUGÍA")
    c.drawCentredString(width / 2, height - 4*cm, "CONSENTIMIENTO INFORMADO")
    
    # Contenido minimalista
    c.setFont("Helvetica", 10)
    text = c.beginText(2*cm, height - 6*cm)
    text.textLine("Paciente: Juan Pérez")
    text.textLine("Procedimiento: Colecistectomía")
    c.drawText(text)
    
    # Nota de ausencia de información
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.red)
    c.drawString(2*cm, height - 12*cm, "[ADVERTENCIA: DOCUMENTO INCOMPLETO]")
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 9)
    
    text = c.beginText(2*cm, height - 14*cm)
    text.textLine("El siguiente documento carece de información esencial:")
    text.textLine("❌ Sin fecha del procedimiento")
    text.textLine("❌ Sin nombre completo del paciente")
    text.textLine("❌ Sin número de documento")
    text.textLine("❌ Sin descripción de riesgos")
    text.textLine("❌ Sin alternativas al procedimiento")
    text.textLine("❌ Sin firma del médico")
    text.textLine("❌ Sin firma del anestesiólogo")
    text.textLine("❌ Sin firma del paciente")
    c.drawText(text)
    
    c.save()
    print(f"PDF malo creado: {output_path}")

if __name__ == "__main__":
    create_good_pdf("consentimiento_bueno.pdf")
    create_bad_pdf("consentimiento_malo.pdf")
    print("\nPDFs generados exitosamente en la carpeta 'documentos'")
