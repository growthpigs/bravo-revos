# RevOS Design System - FINAL
## Professional B2B Growth Engine Interface

---

## **DESIGN PHILOSOPHY**

> **"Professional data intelligence with sophisticated execution"**

**Core Principles:**
1. **Data density without overwhelm** (Front-inspired analytics)
2. **Sophisticated minimalism** (Linear-inspired settings)
3. **Clear visual hierarchy** through typography contrast
4. **Purposeful color** (not decorative)
5. **Trust through restraint** (B2B credibility)

---

## **COLOR SYSTEM**

### **Primary Palette**

```css
/* Purple - Primary Brand (Linear-inspired, darker tone) */
--purple-50: #F5F3FF;
--purple-100: #EDE9FE;
--purple-200: #DDD6FE;
--purple-300: #C4B5FD;
--purple-400: #A78BFA;
--purple-500: #8B5CF6;   /* Primary purple */
--purple-600: #7C3AED;   /* Primary hover */
--purple-700: #6D28D9;   /* Primary active */
--purple-800: #5B21B6;
--purple-900: #4C1D95;

/* Green - Success & Positive Actions (Jobber-inspired) */
--green-50: #F0FDF4;
--green-100: #DCFCE7;
--green-200: #BBF7D0;
--green-300: #86EFAC;
--green-400: #4ADE80;
--green-500: #22C55E;   /* Success green */
--green-600: #16A34A;   /* Success hover */
--green-700: #15803D;
--green-800: #166534;
--green-900: #14532D;

/* Orange - Secondary Accent & CTAs (Linear danger zone inspired) */
--orange-50: #FFF7ED;
--orange-100: #FFEDD5;
--orange-200: #FED7AA;
--orange-300: #FDBA74;
--orange-400: #FB923C;
--orange-500: #F97316;   /* Secondary CTA */
--orange-600: #EA580C;   /* Secondary hover */
--orange-700: #C2410C;
--orange-800: #9A3412;
--orange-900: #7C2D12;
```

### **Neutral Grays (Light Theme Foundation)**

```css
/* Refined gray scale for professional B2B interface */
--gray-50: #FAFAFA;      /* Page background */
--gray-100: #F5F5F5;     /* Card backgrounds */
--gray-200: #E5E5E5;     /* Subtle borders */
--gray-300: #D4D4D4;     /* Standard borders */
--gray-400: #A3A3A3;     /* Disabled elements */
--gray-500: #737373;     /* Muted text */
--gray-600: #525252;     /* Secondary text */
--gray-700: #404040;     /* Body text */
--gray-800: #262626;     /* Emphasis text */
--gray-900: #171717;     /* Headings */
--black: #000000;        /* Maximum contrast */
--white: #FFFFFF;        /* Pure white */
```

### **Semantic Colors**

```css
/* Success */
--success: var(--green-500);
--success-bg: var(--green-50);
--success-border: var(--green-300);

/* Warning */
--warning: var(--orange-500);
--warning-bg: var(--orange-50);
--warning-border: var(--orange-300);

/* Error */
--error: #DC2626;
--error-bg: #FEF2F2;
--error-border: #FCA5A5;

/* Info */
--info: var(--purple-500);
--info-bg: var(--purple-50);
--info-border: var(--purple-300);
```

### **Data Visualization Palette**

```css
/* Chart colors for analytics */
--chart-primary: var(--purple-500);
--chart-secondary: var(--purple-400);
--chart-tertiary: var(--purple-300);
--chart-success: var(--green-500);
--chart-warning: var(--orange-500);
--chart-error: #DC2626;
--chart-neutral: var(--gray-400);

/* Heatmap gradients */
--heat-0: var(--gray-100);      /* No activity */
--heat-1: var(--purple-100);    /* Low */
--heat-2: var(--purple-300);    /* Medium */
--heat-3: var(--purple-500);    /* High */
--heat-4: var(--purple-700);    /* Peak */
```

---

## **TYPOGRAPHY**

### **Font Families**

```css
/* Headings - Elegant serif for sophistication */
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap');

/* UI Components - Monospace for technical precision */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* Body Text & Data - Professional sans-serif (Inter - industry standard) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-heading: 'Libre Baskerville', Georgia, serif;
  --font-ui: 'JetBrains Mono', 'Consolas', monospace;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-condensed: 'Inter', sans-serif; /* Inter works for both body and condensed data */
}
```

### **Type Scale (Production-Tested - 20% Smaller)**

```css
:root {
  /* Headings (Libre Baskerville) */
  --text-h1: 28px;    /* Page titles (was 36px) */
  --text-h2: 22px;    /* Section headers (was 28px) */
  --text-h3: 18px;    /* Subsection headers (was 22px) */
  --text-h4: 16px;    /* Card headers (was 18px) */
  
  /* UI Components (JetBrains Mono - UPPERCASE) */
  --text-ui-lg: 13px;     /* Large buttons, tabs (was 14px) */
  --text-ui-base: 12px;   /* Standard buttons, labels (was 13px) */
  --text-ui-sm: 11px;     /* Small labels, badges (was 12px) */
  --text-ui-xs: 10px;     /* Helper text, captions (was 11px) */
  
  /* Body Text (Inter) */
  --text-body-lg: 15px;   /* Large paragraphs (was 16px) */
  --text-body: 14px;      /* Standard body text (was 15px) */
  --text-body-sm: 13px;   /* Small body text (was 14px) */
  
  /* Data/Tables (Inter) */
  --text-data-lg: 15px;   /* Large metrics (was 16px) */
  --text-data: 13px;      /* Table cells (was 14px) */
  --text-data-sm: 12px;   /* Compact tables (was 13px) */
  
  /* Metrics Display (Inter) */
  --text-metric-xxl: 38px;  /* Hero numbers (was 48px) */
  --text-metric-xl: 28px;   /* Dashboard metrics (was 36px) */
  --text-metric-lg: 22px;   /* Card metrics (was 28px) */
  --text-metric-md: 16px;   /* Small metrics (was 20px) */
}
```

### **Font Weights**

```css
:root {
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

### **Line Heights**

```css
:root {
  --leading-tight: 1.25;    /* Headings */
  --leading-snug: 1.375;    /* UI components */
  --leading-normal: 1.5;    /* Body text */
  --leading-relaxed: 1.625; /* Longer paragraphs */
}
```

### **Letter Spacing**

```css
:root {
  --tracking-tight: -0.02em;   /* Large headings */
  --tracking-normal: 0;        /* Body text */
  --tracking-wide: 0.025em;    /* UI components */
  --tracking-wider: 0.05em;    /* All-caps labels */
}
```

---

## **TYPOGRAPHY USAGE EXAMPLES**

```css
/* Page Title */
h1, .page-title {
  font-family: var(--font-heading);
  font-size: var(--text-h1);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  color: var(--gray-900);
}

/* Section Header */
h2, .section-header {
  font-family: var(--font-heading);
  font-size: var(--text-h2);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--gray-900);
}

/* Subsection Header */
h3, .subsection-header {
  font-family: var(--font-heading);
  font-size: var(--text-h3);
  font-weight: var(--weight-normal);
  line-height: var(--leading-snug);
  color: var(--gray-800);
}

/* UI Label (JetBrains Mono - UPPERCASE) */
.label, .ui-label {
  font-family: var(--font-ui);
  font-size: var(--text-ui-sm);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--gray-600);
}

/* Button Text (JetBrains Mono - UPPERCASE) */
.button {
  font-family: var(--font-ui);
  font-size: var(--text-ui-base);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

/* Body Text (Inter) */
p, .body-text {
  font-family: var(--font-body);
  font-size: var(--text-body);
  font-weight: var(--weight-normal);
  line-height: var(--leading-normal);
  color: var(--gray-700);
}

/* Table Cell (Inter) */
.table-cell {
  font-family: var(--font-condensed);
  font-size: var(--text-data);
  font-weight: var(--weight-normal);
  color: var(--gray-700);
}

/* Large Metric (Inter) */
.metric-value {
  font-family: var(--font-condensed);
  font-size: var(--text-metric-xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--gray-900);
}

/* Metric Label (JetBrains Mono - UPPERCASE) */
.metric-label {
  font-family: var(--font-ui);
  font-size: var(--text-ui-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--gray-500);
}
```

---

## **SPACING SYSTEM (Production-Optimized)**

```css
:root {
  /* Base spacing scale (4px increments) - use smaller values for production */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}

/* PRODUCTION GUIDANCE: Use smaller values than you think
   - Cards: p-3 or p-4 (not p-6)
   - Sections: py-8 or py-12 (not py-16 or py-24)
   - Buttons: px-4 py-2 or px-6 py-3 (not px-8 py-4)
   - Gaps: gap-3 or gap-4 (not gap-6 or gap-8)
*/
```

---

## **COMPONENT LIBRARY**

### **Buttons (Production-Optimized Sizing)**

```css
/* Primary Button (Purple) */
.btn-primary {
  background: var(--purple-600);
  color: var(--white);
  font-family: var(--font-ui);
  font-size: var(--text-ui-base); /* 12px */
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  padding: 8px 16px; /* Reduced from 10px 20px */
  border-radius: 6px;
  border: none;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(124, 58, 237, 0.2);
}

.btn-primary:hover {
  background: var(--purple-700);
  box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3);
  transform: translateY(-1px);
}

.btn-primary:active {
  background: var(--purple-800);
  transform: translateY(0);
}

/* Secondary Button (Orange) */
.btn-secondary {
  background: var(--orange-500);
  color: var(--white);
  font-family: var(--font-ui);
  font-size: var(--text-ui-base);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--orange-600);
}

/* Success Button (Green) */
.btn-success {
  background: var(--green-500);
  color: var(--white);
  font-family: var(--font-ui);
  font-size: var(--text-ui-base);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  transition: all 0.2s ease;
}

.btn-success:hover {
  background: var(--green-600);
}

/* Ghost Button */
.btn-ghost {
  background: transparent;
  color: var(--gray-700);
  font-family: var(--font-ui);
  font-size: var(--text-ui-base);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--gray-300);
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  background: var(--gray-100);
  border-color: var(--purple-500);
  color: var(--purple-600);
}

/* Danger Button (Red - Linear-inspired) */
.btn-danger {
  background: var(--error);
  color: var(--white);
  font-family: var(--font-ui);
  font-size: var(--text-ui-base);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  background: #B91C1C;
}
```

### **Cards**

```css
/* Standard Card */
.card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Metric Card */
.card-metric {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.metric-label {
  font-family: var(--font-ui);
  font-size: var(--text-ui-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--gray-500);
}

.metric-value {
  font-family: var(--font-condensed);
  font-size: var(--text-metric-xl);
  font-weight: var(--weight-bold);
  color: var(--gray-900);
}

.metric-change {
  font-family: var(--font-body);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.metric-change.positive {
  color: var(--green-600);
}

.metric-change.negative {
  color: var(--error);
}
```

### **Forms & Inputs**

```css
/* Input Label */
.input-label {
  font-family: var(--font-ui);
  font-size: var(--text-ui-sm);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--gray-600);
  margin-bottom: var(--space-2);
  display: block;
}

/* Text Input */
.input {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: 6px;
  padding: 10px 14px;
  width: 100%;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--purple-500);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.input:disabled {
  background: var(--gray-100);
  color: var(--gray-400);
  cursor: not-allowed;
}

.input::placeholder {
  color: var(--gray-400);
  font-style: italic;
}

/* Select/Dropdown */
.select {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: 6px;
  padding: 10px 38px 10px 14px;
  width: 100%;
  appearance: none;
  background-image: url("data:image/svg+xml...");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: all 0.2s ease;
}

.select:focus {
  outline: none;
  border-color: var(--purple-500);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

/* Toggle Switch (Linear-inspired) */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--gray-300);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--white);
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background: var(--purple-600);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Radio Button Group (Jobber-inspired) */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--gray-300);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-option:hover {
  border-color: var(--purple-400);
  background: var(--purple-50);
}

.radio-option.selected {
  border-color: var(--green-500);
  background: var(--green-50);
}

.radio-option .radio-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--gray-400);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-option.selected .radio-circle {
  border-color: var(--green-500);
  background: var(--green-500);
}

.radio-option.selected .radio-circle:after {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--white);
  border-radius: 50%;
}
```

### **Badges & Pills**

```css
/* Standard Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px 10px;
  border-radius: 12px;
  font-family: var(--font-ui);
  font-size: var(--text-ui-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
}

.badge-purple {
  background: var(--purple-100);
  color: var(--purple-700);
}

.badge-green {
  background: var(--green-100);
  color: var(--green-700);
}

.badge-orange {
  background: var(--orange-100);
  color: var(--orange-700);
}

.badge-neutral {
  background: var(--gray-100);
  color: var(--gray-700);
}

/* Status Badge */
.badge-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-family: var(--font-body);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
}

.badge-status-active {
  background: var(--green-100);
  color: var(--green-700);
}

.badge-status-paused {
  background: var(--orange-100);
  color: var(--orange-700);
}

.badge-status-draft {
  background: var(--gray-100);
  color: var(--gray-600);
}

.badge-status:before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
```

### **Tables**

```css
/* Table Container */
.table-container {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  overflow: hidden;
}

/* Table */
.table {
  width: 100%;
  border-collapse: collapse;
}

/* Table Header */
.table thead {
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
}

.table th {
  font-family: var(--font-ui);
  font-size: var(--text-ui-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--gray-600);
  text-align: left;
  padding: 12px 16px;
}

/* Table Body */
.table td {
  font-family: var(--font-condensed);
  font-size: var(--text-data);
  color: var(--gray-700);
  padding: 12px 16px;
  border-bottom: 1px solid var(--gray-200);
}

.table tbody tr:hover {
  background: var(--gray-50);
}

.table tbody tr:last-child td {
  border-bottom: none;
}

/* Table Cell Variants */
.table-cell-emphasis {
  font-weight: var(--weight-semibold);
  color: var(--gray-900);
}

.table-cell-muted {
  color: var(--gray-500);
}
```

### **Sidebar Navigation (Linear-inspired)**

```css
.sidebar {
  width: 240px;
  background: var(--gray-50);
  border-right: 1px solid var(--gray-200);
  height: 100vh;
  overflow-y: auto;
}

.sidebar-section {
  padding: var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--gray-200);
}

.sidebar-section-title {
  font-family: var(--font-ui);
  font-size: var(--text-ui-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--gray-500);
  margin-bottom: var(--space-2);
  padding: 0 var(--space-3);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-body-sm);
  font-weight: var(--weight-medium);
  color: var(--gray-700);
  border-radius: 6px;
  margin: 2px 0;
  transition: all 0.15s ease;
  cursor: pointer;
}

.nav-item:hover {
  background: var(--white);
  color: var(--gray-900);
}

.nav-item-active {
  background: var(--white);
  color: var(--purple-600);
  font-weight: var(--weight-semibold);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.nav-icon {
  width: 18px;
  height: 18px;
  opacity: 0.7;
  flex-shrink: 0;
}

.nav-item-active .nav-icon {
  opacity: 1;
  color: var(--purple-600);
}
```

---

## **LAYOUT GRID**

```css
/* Main Layout Container */
.app-layout {
  display: flex;
  height: 100vh;
}

.app-sidebar {
  width: 240px;
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  height: 64px;
  border-bottom: 1px solid var(--gray-200);
  padding: 0 var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--white);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
  background: var(--gray-50);
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-5);
}

.grid-col-4 {
  grid-column: span 4;
}

.grid-col-6 {
  grid-column: span 6;
}

.grid-col-8 {
  grid-column: span 8;
}

.grid-col-12 {
  grid-column: span 12;
}
```

---

## **INTERACTION STATES**

```css
/* Focus Ring */
:focus-visible {
  outline: 2px solid var(--purple-500);
  outline-offset: 2px;
}

/* Disabled State */
[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading State */
.loading {
  position: relative;
  overflow: hidden;
}

.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.5),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
```

---

## **DATA VISUALIZATION COMPONENTS**

### **Heatmap (Front-inspired)**

```css
.heatmap-table {
  border-collapse: separate;
  border-spacing: 2px;
}

.heatmap-cell {
  padding: 8px;
  text-align: center;
  font-family: var(--font-condensed);
  font-size: var(--text-data-sm);
  font-weight: var(--weight-semibold);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.heatmap-cell-0 { background: var(--gray-100); color: var(--gray-400); }
.heatmap-cell-1 { background: var(--purple-100); color: var(--purple-700); }
.heatmap-cell-2 { background: var(--purple-300); color: var(--white); }
.heatmap-cell-3 { background: var(--purple-500); color: var(--white); }
.heatmap-cell-4 { background: var(--purple-700); color: var(--white); }

.heatmap-cell:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}
```

---

## **RESPONSIVE BREAKPOINTS & IMAGE HANDLING**

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Mobile First Approach */
@media (max-width: 768px) {
  .app-sidebar {
    display: none; /* Mobile: hide sidebar, use hamburger menu */
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .grid-col-4,
  .grid-col-6,
  .grid-col-8,
  .grid-col-12 {
    grid-column: span 1;
  }
}
```

### **CRITICAL: Image & Logo Handling**

**Never distort images or logos at any breakpoint:**

```css
/* Logo - ALWAYS maintain aspect ratio */
.logo {
  max-width: 120px;
  max-height: 40px;
  width: auto;
  height: auto;
  object-fit: contain; /* NEVER use 'cover' or 'fill' */
}

/* All images - prevent distortion */
img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

/* Icon images */
.icon-img {
  width: 100%;
  max-width: 48px;
  height: auto;
  object-fit: contain;
}

/* Avatar images */
.avatar {
  width: 40px;
  height: 40px;
  object-fit: cover; /* Only use 'cover' for square avatars */
  border-radius: 50%;
}
```

**Tailwind Examples:**
```html
<!-- Logo (correct) -->
<img src="/logo.png" class="max-w-[120px] max-h-[40px] w-auto h-auto object-contain" />

<!-- Feature icon (correct) -->
<img src="/icon.png" class="w-full max-w-[48px] h-auto object-contain" />

<!-- NEVER do this -->
<img src="/logo.png" class="w-32 h-16 object-cover" /> <!-- ❌ Will distort! -->
```

---

## **SHADCN/UI INTEGRATION**

All components should use shadcn/ui primitives where applicable:

```bash
# Install shadcn components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add tabs
```

**Theme configuration for shadcn:**
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--gray-200))",
        input: "hsl(var(--gray-300))",
        ring: "hsl(var(--purple-500))",
        background: "hsl(var(--white))",
        foreground: "hsl(var(--gray-900))",
        primary: {
          DEFAULT: "hsl(var(--purple-600))",
          foreground: "hsl(var(--white))",
        },
        secondary: {
          DEFAULT: "hsl(var(--orange-500))",
          foreground: "hsl(var(--white))",
        },
        // ... etc
      },
    },
  },
}
```

---

## **IMPLEMENTATION CHECKLIST**

### **Phase 1: Foundation**
- [ ] Install fonts (Libre Baskerville, JetBrains Mono, Barlow, Barlow Condensed)
- [ ] Configure Tailwind with custom color palette
- [ ] Set up shadcn/ui with theme configuration
- [ ] Create base typography classes
- [ ] Implement spacing system

### **Phase 2: Core Components**
- [ ] Buttons (primary, secondary, success, ghost, danger)
- [ ] Forms (inputs, selects, toggles, radio groups)
- [ ] Cards (standard, metric cards)
- [ ] Badges & Pills
- [ ] Tables (with heatmap variant)
- [ ] Sidebar navigation

### **Phase 3: Layout**
- [ ] App shell (sidebar + header + content)
- [ ] Dashboard grid system
- [ ] Responsive breakpoints

### **Phase 4: Data Visualization**
- [ ] Metric cards with large numbers
- [ ] Line charts (using Recharts)
- [ ] Heatmap tables
- [ ] Donut/pie charts
- [ ] Empty states

---

## **DESIGN PRINCIPLES SUMMARY**

1. **Serif Headings** (Libre Baskerville) = Sophistication & Authority
2. **Mono UI Labels** (JetBrains Mono, UPPERCASE) = Technical Precision
3. **Sans Body & Data** (Inter) = Professional Industry Standard
4. **Purple Primary** = Modern B2B Trust
5. **Green Success** = Positive Growth Actions
6. **Orange Secondary** = Important CTAs & Attention
7. **Light Theme** = Professional, Clean, Accessible
8. **Data-Dense but Breathable** = Smart use of whitespace
9. **Purposeful Color** = Never decorative, always meaningful
10. **Nord-Inspired Clarity** = Clean, readable, professional

**Target User Experience:**
"I trust this platform to handle my business-critical outreach. 
It feels sophisticated but approachable, powerful but not intimidating."
