document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const filenameDisplay = document.getElementById('filename-display');
    const analyzeBtn = document.getElementById('analyze-btn');
    const uploadSection = document.getElementById('upload-section');
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');

    // ===== THEME TOGGLE =====
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    themeIcon.className = savedTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';

    themeToggle.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeIcon.className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    });

    // ===== DRAG & DROP =====
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
        dropZone.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.add('dragover')));
    ['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.remove('dragover')));
    dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
    fileInput.addEventListener('change', function () { handleFiles(this.files); });

    function handleFiles(files) {
        if (!files.length) return;
        const file = files[0];
        if (!file.name.endsWith('.pptx')) { alert('Please upload a valid .pptx file.'); return; }
        filenameDisplay.textContent = file.name;
        dropZone.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        window.selectedFile = file;
    }

    // ===== LOADING BAR ANIMATION =====
    function startLoadingBar() {
        const bar = document.getElementById('loading-bar');
        const steps = [document.getElementById('step-1'), document.getElementById('step-2'), document.getElementById('step-3')];
        let progress = 0;
        steps.forEach(s => s.classList.remove('active'));
        steps[0].classList.add('active');
        bar.style.width = '0%';

        const interval = setInterval(() => {
            progress += 1;
            bar.style.width = Math.min(progress, 90) + '%';
            if (progress === 30) steps[1].classList.add('active');
            if (progress === 60) steps[2].classList.add('active');
            if (progress >= 90) clearInterval(interval);
        }, 80);
        return interval;
    }

    // ===== ANALYZE =====
    analyzeBtn.addEventListener('click', () => {
        if (!window.selectedFile) return;
        const formData = new FormData();
        formData.append('file', window.selectedFile);
        uploadSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        const loadInterval = startLoadingBar();

        fetch('/analyze', { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                clearInterval(loadInterval);
                document.getElementById('loading-bar').style.width = '100%';
                setTimeout(() => {
                    if (data.error) { alert('Error: ' + data.error); location.reload(); return; }
                    displayResults(data);
                }, 400);
            })
            .catch(() => { alert('An error occurred during analysis.'); location.reload(); });
    });

    // ===== HELPERS =====
    function animateCount(el, target) {
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 40));
        const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = current;
            if (current >= target) clearInterval(timer);
        }, 30);
    }

    function animateScore(score) {
        const ring = document.getElementById('score-ring-fill');
        const scoreEl = document.getElementById('overall-score');
        const label = document.getElementById('score-label');
        const circumference = 326.7;
        const offset = circumference - (score / 10) * circumference;
        let color, text;
        if (score >= 8) { color = '#10b981'; text = 'Excellent'; }
        else if (score >= 6) { color = '#f59e0b'; text = 'Good'; }
        else { color = '#ef4444'; text = 'Needs Work'; }
        ring.style.stroke = color;
        label.style.color = color;
        label.textContent = text;
        setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
        let current = 0;
        const timer = setInterval(() => {
            current = Math.min(parseFloat((current + 0.2).toFixed(1)), score);
            scoreEl.textContent = current.toFixed(1);
            if (current >= score) clearInterval(timer);
        }, 40);
    }

    function getReadabilityColor(score) {
        if (score >= 70) return '#10b981';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    }

    // ===== CHARTS =====
    function renderCharts(slides) {
        const labels = slides.map(s => `S${s.slide_number}`);
        const errors = slides.map(s => s.error_count);
        const readability = slides.map(s => s.readability_score || 0);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        const chartDefaults = {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } },
                y: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } }
            }
        };

        new Chart(document.getElementById('errorsChart'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: errors,
                    backgroundColor: errors.map(e => e > 0 ? 'rgba(245,158,11,0.7)' : 'rgba(16,185,129,0.7)'),
                    borderRadius: 6, borderSkipped: false
                }]
            },
            options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, beginAtZero: true, ticks: { ...chartDefaults.scales.y.ticks, stepSize: 1 } } } }
        });

        new Chart(document.getElementById('readabilityChart'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data: readability,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    borderWidth: 2, pointRadius: 4,
                    pointBackgroundColor: '#3b82f6', fill: true, tension: 0.4
                }]
            },
            options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 100 } } }
        });
    }

    // ===== FILTER TABS =====
    function setupFilterTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                document.querySelectorAll('.slide-card').forEach(card => {
                    const hasErrors = card.dataset.errors > 0;
                    if (filter === 'all') card.classList.remove('hidden-card');
                    else if (filter === 'issues') card.classList.toggle('hidden-card', !hasErrors);
                    else if (filter === 'clean') card.classList.toggle('hidden-card', hasErrors);
                });
            });
        });
    }

    // ===== PDF DOWNLOAD =====
    function setupPdfBtn() {
        document.getElementById('download-pdf-btn').addEventListener('click', () => {
            const btn = document.getElementById('download-pdf-btn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
            btn.disabled = true;
            fetch('/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.analysisData)
            })
            .then(r => r.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'ppt_analysis_report.pdf'; a.click();
                URL.revokeObjectURL(url);
                btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download PDF Report';
                btn.disabled = false;
            })
            .catch(() => {
                alert('Failed to generate PDF.');
                btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download PDF Report';
                btn.disabled = false;
            });
        });
    }

    // ===== DISPLAY RESULTS =====
    function displayResults(data) {
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        window.analysisData = data;

        animateScore(data.overall_score);
        const cleanSlides = data.slide_analysis.filter(s => s.error_count === 0).length;
        const totalWords = data.slide_analysis.reduce((sum, s) => sum + (s.word_count || 0), 0);
        animateCount(document.getElementById('total-errors'), data.total_grammar_errors);
        animateCount(document.getElementById('total-slides'), data.slide_analysis.length);
        animateCount(document.getElementById('clean-slides'), cleanSlides);
        animateCount(document.getElementById('total-words'), totalWords);

        // Fixed File Link
        const fixedBtn = document.getElementById('download-fixed-btn');
        if (data.fixed_file_url) {
            fixedBtn.href = data.fixed_file_url;
            fixedBtn.classList.remove('hidden');
        } else {
            fixedBtn.classList.add('hidden');
        }

        // Flow
        const flowList = document.getElementById('flow-list');
        data.flow_feedback.forEach(fb => {
            const li = document.createElement('li');
            li.textContent = fb;
            if (fb.toLowerCase().includes('weak') || fb.toLowerCase().includes('missing')) li.classList.add('warn');
            flowList.appendChild(li);
        });

        // Charts
        renderCharts(data.slide_analysis);

        // Slide Cards
        const slideContainer = document.getElementById('slide-feedback-container');
        data.slide_analysis.forEach((slide, i) => {
            let grammarHtml = '';
            if (slide.grammar_errors.length === 0) {
                grammarHtml = '<p class="no-errors"><i class="fa-solid fa-circle-check"></i> No grammar issues found.</p>';
            } else {
                slide.grammar_errors.forEach(err => {
                    const sugg = err.replacements.length > 0
                        ? `<span class="suggestions"><i class="fa-solid fa-lightbulb"></i> ${err.replacements.join(', ')}</span>` : '';
                    grammarHtml += `<div class="grammar-error"><strong>${err.message}</strong><br><em style="color:var(--text-muted);font-size:0.8rem">"...${err.context}..."</em>${sugg}</div>`;
                });
            }

            // Keywords
            const keywords = slide.keywords || [];
            const keywordHtml = keywords.length
                ? `<div class="keyword-tags">${keywords.map(k => `<span class="keyword-tag">${k.word} <span style="opacity:0.6">${k.count}</span></span>`).join('')}</div>`
                : '<p style="color:var(--text-muted);font-size:0.85rem">No keywords found.</p>';

            // Readability
            const rs = slide.readability_score || 0;
            const rl = slide.readability_label || 'N/A';
            const rc = getReadabilityColor(rs);
            const readabilityHtml = `
                <div class="readability-bar-wrap">
                    <span class="readability-label" style="color:${rc}">${rl} (${rs}/100)</span>
                    <div class="readability-bar-track">
                        <div class="readability-bar-fill" style="width:${rs}%;background:${rc}"></div>
                    </div>
                </div>`;

            const badgeClass = slide.error_count > 0 ? 'badge-error' : 'badge-ok';
            const badgeIcon = slide.error_count > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check';
            const badgeText = slide.error_count > 0 ? `${slide.error_count} Error${slide.error_count > 1 ? 's' : ''}` : 'Clean';

            const card = document.createElement('div');
            card.className = 'slide-card';
            card.dataset.errors = slide.error_count;
            card.style.animationDelay = `${i * 0.05}s`;
            card.innerHTML = `
                <div class="slide-header">
                    <h3><i class="fa-regular fa-file-powerpoint"></i> Slide ${slide.slide_number}</h3>
                    <span class="error-badge ${badgeClass}"><i class="fa-solid ${badgeIcon}"></i> ${badgeText}</span>
                </div>
                <div class="slide-snippet">"${slide.text_snippet}"</div>
                <div class="feedback-grid-3">
                    <div class="feedback-box">
                        <h4><i class="fa-solid fa-text-width"></i> Content</h4>
                        <p style="font-size:0.88rem">${slide.length_feedback}</p>
                        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.3rem">${slide.word_count} words</p>
                    </div>
                    <div class="feedback-box">
                        <h4><i class="fa-solid fa-book-open"></i> Readability</h4>
                        ${readabilityHtml}
                    </div>
                    <div class="feedback-box">
                        <h4><i class="fa-solid fa-tags"></i> Top Keywords</h4>
                        ${keywordHtml}
                    </div>
                </div>
                <div class="feedback-box" style="margin-top:1rem">
                    <h4><i class="fa-solid fa-spell-check"></i> Grammar & Spelling</h4>
                    ${grammarHtml}
                </div>`;
            slideContainer.appendChild(card);
        });

        setupFilterTabs();
        setupPdfBtn();
    }
});
