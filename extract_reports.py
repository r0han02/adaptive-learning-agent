import zipfile
import xml.etree.ElementTree as ET

def extract_docx_text(filename):
    try:
        with zipfile.ZipFile(filename) as z:
            root = ET.fromstring(z.read('word/document.xml'))
            text = ''.join([t.text for t in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text])
            return text
    except Exception as e:
        return f"Error: {str(e)}"

report1 = extract_docx_text('report 1-RA2411003010893.docx')
report2 = extract_docx_text('report 2.docx')

print('=== REPORT 1 ===')
print(report1)
print('\n\n=== REPORT 2 ===')
print(report2)

# Save to files for easier viewing
with open('report1_text.txt', 'w', encoding='utf-8') as f:
    f.write(report1)
with open('report2_text.txt', 'w', encoding='utf-8') as f:
    f.write(report2)
