# -*- coding: utf-8 -*-
import PyPDF2
import sys

pdf_path = r'c:\AiNeed\炳丰（南京）信息科技有限公司——营业执照.pdf'

try:
    with open(pdf_path, 'rb') as pdf_file:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        for page_num, page in enumerate(pdf_reader.pages):
            print(f"=== Page {page_num + 1} ===")
            text = page.extract_text()
            print(text)
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
