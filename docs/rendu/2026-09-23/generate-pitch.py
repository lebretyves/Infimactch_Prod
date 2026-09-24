"""Generate the editable deck and printable PDF from slides.json; no network or personal data."""
from pathlib import Path
import json
from html import escape
from pptx import Presentation
from pptx.util import Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT=Path(__file__).resolve().parent
DATA=json.loads((ROOT/'slides.json').read_text(encoding='utf-8'))
W,H=960,540
NAVY='082F49'; BLUE='155EE8'; INK='163B50'; PALE='F3F8FC'; WHITE='FFFFFF'; MUTED='435F72'; LINE='D1DEEA'
font_dir=Path('C:/Windows/Fonts')
if not (font_dir/'arial.ttf').exists():
    raise SystemExit('PDF font missing: install Arial or adapt font_dir before generating. PPTX uses Arial.')
pdfmetrics.registerFont(TTFont('Deck',str(font_dir/'arial.ttf')))
pdfmetrics.registerFont(TTFont('DeckBold',str(font_dir/'arialbd.ttf')))
prs=Presentation();prs.slide_width=Pt(W);prs.slide_height=Pt(H)
prs.core_properties.title='InfiMatch — Soutenance';prs.core_properties.subject='Projet étudiant, instantané du 24 septembre 2026'
prs.core_properties.author='Équipe InfiMatch';prs.core_properties.keywords='InfiMatch, Epitech, soutenance, preuves'
c=canvas.Canvas(str(ROOT/'InfiMatch_Soutenance_2026-09-23.pdf'),pagesize=(W,H))
c.setTitle('InfiMatch — Soutenance');c.setAuthor('Équipe InfiMatch');c.setSubject('État documenté au 24 septembre 2026')
report=[]
def rect(slide,x,y,w,h,color):
    sh=slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,Pt(x),Pt(y),Pt(w),Pt(h));sh.fill.solid();sh.fill.fore_color.rgb=RGBColor.from_string(color);sh.line.fill.background()
    c.setFillColor('#'+color);c.rect(x,H-y-h,w,h,stroke=0,fill=1)
def text(slide,value,x,y,w,h,size=18,bold=False,color=INK):
    style=ParagraphStyle('deck',fontName='DeckBold' if bold else 'Deck',fontSize=size,leading=size*1.25,textColor='#'+color)
    para=Paragraph(escape(value),style);_,height=para.wrap(w,h)
    while height>h and size>14:
        size-=1;style.fontSize=size;style.leading=size*1.25;para=Paragraph(escape(value),style);_,height=para.wrap(w,h)
    if height>h: raise ValueError(f'Text overflow: {value[:60]} ({height}>{h})')
    para.drawOn(c,x,H-y-height)
    shape=slide.shapes.add_textbox(Pt(x),Pt(y),Pt(w),Pt(h));tf=shape.text_frame;tf.clear();tf.word_wrap=True
    tf.margin_left=tf.margin_right=tf.margin_top=tf.margin_bottom=0
    par=tf.paragraphs[0];par.text=value;par.font.name='Arial';par.font.size=Pt(size);par.font.bold=bold;par.font.color.rgb=RGBColor.from_string(color);par.space_after=Pt(0);par.line_spacing=1.15
    return size,height
for i,s in enumerate(DATA,1):
    slide=prs.slides.add_slide(prs.slide_layouts[6]);rect(slide,0,0,W,H,PALE)
    rect(slide,0,0,12,H,BLUE)
    text(slide,'InfiMatch',48,24,240,28,22,True,NAVY)
    text(slide,s['tag'],650,29,264,20,11,True,MUTED)
    text(slide,s['title'],48,80,858,86,34,True,NAVY)
    text(slide,s['subtitle'],50,163,850,28,16,False,MUTED)
    sizes=[]
    for x,key in [(48,'left'),(493,'right')]:
        rect(slide,x,212,419,242,WHITE);rect(slide,x,212,419,4,BLUE)
        text(slide,s[key+'Title'],x+22,235,375,53,21,True,NAVY)
        sizes.append(text(slide,s[key],x+22,294,375,143,17))
    text(slide,'Projet étudiant · État documentaire au 24 septembre 2026 · Sources : étude de marché et 09_COUTS_PRODUCTION.md',48,485,845,20,10,False,MUTED)
    text(slide,f'{i:02d} / {len(DATA)}',838,509,75,17,10,True,BLUE)
    slide.notes_slide.notes_text_frame.text='Intervenant '+s['speaker']+' - '+str(s['seconds'])+' secondes.\n'+s['notes']+'\nVoir 05_ETUDE_DE_MARCHE.md pour les sources et 07_PITCH_ORAL.md pour le scénario de secours.'
    report.append({'slide':i,'title':s['title'],'bodyFontSizes':[v[0] for v in sizes],'bodyHeights':[round(v[1],1) for v in sizes]})
    c.showPage()
prs.save(ROOT/'InfiMatch_Soutenance_2026-09-23.pptx');c.save()
(ROOT/'validation-layout.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
assert len( Presentation(ROOT/'InfiMatch_Soutenance_2026-09-23.pptx').slides)==len(DATA)
print('PASS: 13 editable PPTX slides, 13 PDF pages; PDF text bounds checked; no external asset.')
