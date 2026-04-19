# Project Report: AI-Based PPT Analyzer & Feedback System

## 1. Introduction
The **AI-Based PPT Analyzer & Feedback System** is an intelligent web application designed to automatically evaluate PowerPoint presentations (.pptx). It uses Natural Language Processing (NLP) to analyze slide content, grammar, length, and flow, providing users with a comprehensive feedback report and an overall score out of 10. This project aims to help students, professionals, and educators improve their presentation quality.

## 2. Technical Stack
- **Backend**: Python, Flask
- **Frontend**: HTML5, Vanilla CSS (Glassmorphism design), JavaScript
- **NLP Libraries**:
  - `python-pptx`: To extract text and metadata from `.pptx` files.
  - `language_tool_python`: To detect grammar, spelling, and stylistic errors.
  - `nltk` (Natural Language Toolkit): For tokenization, stop-word removal, and structural flow analysis.

## 3. System Architecture & Flowchart

```text
[User] 
  | (Uploads .pptx file)
  v
[Frontend - Drag & Drop UI] 
  | (Sends via POST request)
  v
[Flask Backend API (/analyze)] 
  |
  +--> [python-pptx] Extracts text from all slides
  |
  +--> [Slide Length Checker] Analyzes word count (Optimal: 10-60 words)
  |
  +--> [Grammar Checker] Uses LanguageTool to find errors
  |
  +--> [Flow Analyzer] Uses NLTK to check keyword overlap between consecutive slides
  |
  v
[Scoring Engine] Calculates deductions and final score out of 10
  |
  v
[Frontend Dashboard] Renders interactive feedback cards & visualizations
```

## 4. Step-by-Step Implementation

1. **Text Extraction**: The `extract_text_from_ppt` function iterates through every shape in each slide. If the shape contains text, it is extracted and mapped to the slide number.
2. **Slide Content Length Analysis**: The `analyze_slide_length` function counts the words. Slides with < 10 words are flagged as lacking context, while > 60 words are flagged as too cluttered.
3. **Grammar & Spell Check**: `language_tool_python` parses the extracted text and returns matches containing the error message, context, and suggested replacements.
4. **Flow & Structure Analysis**: Using NLTK, the text is tokenized, converted to lowercase, and stop words (like 'the', 'is', 'in') are removed. The system compares the remaining keywords of a slide with the previous slide to ensure thematic continuity.
5. **Score Calculation**: Starting from a base score of 10, fractional points are deducted for grammar errors, poor slide lengths, and weak transitions.

## 5. Sample Input and Output Explanation

**Sample Input PPT**:
A 3-slide presentation.
- Slide 1: "Welcom to my project presentation." (Spelling error: Welcom)
- Slide 2: [Empty Slide]
- Slide 3: "The database architecture is highly scalable and reliable." (Good grammar, but weak transition from an empty slide)

**System Output Explanation**:
- **Overall Score**: 8.5 / 10
- **Flow Feedback**: 
  - "Slide 2 is empty, breaking the flow."
  - "Weak transition from Slide 2 to Slide 3."
- **Slide 1 Feedback**: Content Length: Too little text. Grammar Error: "Welcom" -> Suggestion: "Welcome".

## 6. Future Scope & Advanced Features (Viva Highlight)
To further improve this project, the following advanced features could be implemented:
1. **Visual Analysis using Computer Vision**: Utilizing OpenCV or pre-trained models to analyze image quality, contrast, and layout on the slide.
2. **Generative AI Suggestions**: Integrating with LLMs (like OpenAI GPT or Gemini) to automatically rewrite poorly phrased sentences.
3. **Speech-to-Text Rehearsal**: Allowing users to record their voice while clicking through the slides to analyze pacing, filler words (um, uh), and confidence.
4. **Theme and Color Consistency Check**: Analyzing if the presentation adheres to a consistent color palette and readable font sizes.

## 7. Conclusion
This project successfully demonstrates the application of NLP techniques to automate presentation evaluations. By combining a robust Python backend with a visually striking frontend, it offers an intuitive and valuable tool for presentation improvement.
