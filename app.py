import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from analyzer import analyze_presentation
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.units import cm
import io

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # 16 MB max limit

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'pptx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request.'}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Perform AI NLP Analysis on the uploaded PPTX
            results = analyze_presentation(filepath)
            
            # Clean up the file after analysis to save space
            os.remove(filepath)
            
            return jsonify(results)
        except Exception as e:
            # Ensure cleanup on error
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': str(e)}), 500
            
    return jsonify({'error': 'Invalid file type. Only .pptx is allowed.'}), 400

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=22, textColor=colors.HexColor('#3b82f6'), spaceAfter=6)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=13, textColor=colors.HexColor('#1e293b'), spaceAfter=4)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#334155'), spaceAfter=4)
    muted_style = ParagraphStyle('Muted', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#64748b'), spaceAfter=3)
    error_style = ParagraphStyle('Error', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#ef4444'), spaceAfter=3)
    success_style = ParagraphStyle('Success', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#10b981'), spaceAfter=3)

    story = []

    # Title
    story.append(Paragraph('AI PPT Analyzer — Report', title_style))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 0.4*cm))

    # Overview Table
    score = data.get('overall_score', 'N/A')
    total_errors = data.get('total_grammar_errors', 0)
    total_slides = len(data.get('slide_analysis', []))
    clean_slides = sum(1 for s in data.get('slide_analysis', []) if s['error_count'] == 0)
    total_words = sum(s.get('word_count', 0) for s in data.get('slide_analysis', []))

    overview_data = [
        ['Overall Score', 'Grammar Errors', 'Slides Analyzed', 'Clean Slides', 'Total Words'],
        [str(score) + '/10', str(total_errors), str(total_slides), str(clean_slides), str(total_words)]
    ]
    overview_table = Table(overview_data, hAlign='LEFT', colWidths=[3.2*cm]*5)
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#f8fafc'), colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROUNDEDCORNERS', [4]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 0.6*cm))

    # Flow Feedback
    story.append(Paragraph('Structure & Flow Analysis', heading_style))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 0.2*cm))
    for fb in data.get('flow_feedback', []):
        bullet = '⚠ ' if 'Weak' in fb or 'Missing' in fb else '✓ '
        style = error_style if 'Weak' in fb else success_style
        story.append(Paragraph(bullet + fb, style))
    story.append(Spacer(1, 0.6*cm))

    # Slide Analysis
    story.append(Paragraph('Slide-by-Slide Analysis', heading_style))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 0.2*cm))

    for slide in data.get('slide_analysis', []):
        story.append(Paragraph(f"Slide {slide['slide_number']}", ParagraphStyle('SlideTitle', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#3b82f6'), fontName='Helvetica-Bold', spaceAfter=3)))
        story.append(Paragraph(f"Snippet: \"{slide['text_snippet']}\"", muted_style))
        story.append(Paragraph(f"Content: {slide['length_feedback']}  |  Words: {slide['word_count']}", normal_style))

        if slide['error_count'] == 0:
            story.append(Paragraph('✓ No grammar issues found.', success_style))
        else:
            for err in slide['grammar_errors']:
                story.append(Paragraph(f"✗ {err['message']} — Context: \"{err['context']}\"", error_style))
                if err['replacements']:
                    story.append(Paragraph(f"  Suggestion: {', '.join(err['replacements'])}", success_style))

        story.append(Spacer(1, 0.3*cm))
        story.append(HRFlowable(width='100%', thickness=0.3, color=colors.HexColor('#f1f5f9')))
        story.append(Spacer(1, 0.2*cm))

    doc.build(story)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name='ppt_analysis_report.pdf', mimetype='application/pdf')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
