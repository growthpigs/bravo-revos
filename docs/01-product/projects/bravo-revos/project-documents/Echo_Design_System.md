# Echo Design System
**Modern B2B Platform Interface - Mem0 Inspired**

---

## 🎨 DESIGN PHILOSOPHY

> **"Clean, minimal, professional - let the data speak"**

**Core Principles:**
1. **Sans-serif everything** - No serifs, no monospace UI labels
2. **Subtle not bold** - Light backgrounds, clean borders
3. **Data-first** - Tables and information take center stage
4. **Purposeful color** - Black primary, colored badges for categories
5. **Generous spacing** - Breathing room everywhere

---

## 🎨 COLOR SYSTEM

### **Neutrals (Foundation)**
```css
--gray-50: #FAFAFA;    /* Page background */
--gray-100: #F5F5F5;   /* Sidebar, card backgrounds */
--gray-200: #E5E5E5;   /* Borders */
--gray-300: #D4D4D4;   /* Subtle borders */
--gray-400: #A3A3A3;   /* Muted text */
--gray-500: #737373;   /* Secondary text */
--gray-600: #525252;   /* Body text */
--gray-700: #404040;   /* Emphasis text */
--gray-800: #262626;   /* Headings */
--gray-900: #171717;   /* Dark text */
--black: #000000;      /* Primary buttons */
--white: #FFFFFF;      /* Cards, inputs */
```

### **Brand & Semantic Colors**
```css
/* Primary Action - Black (not purple!) */
--primary: #000000;
--primary-hover: #262626;

/* Success - Green */
--success: #10B981;
--success-light: #D1FAE5;
--success-dark: #059669;

/* Danger - Red */
--danger: #DC2626;
--danger-light: #FEE2E2;
--danger-dark: #B91C1C;

/* Info - Blue */
--info: #3B82F6;
--info-light: #DBEAFE;
--info-dark: #2563EB;

/* Badge Colors */
--badge-purple: #8B5CF6;
--badge-purple-light: #EDE9FE;
--badge-blue: #3B82F6;
--badge-blue-light: #DBEAFE;
--badge-green: #10B981;
--badge-green-light: #D1FAE5;
--badge-orange: #F97316;
--badge-orange-light: #FFEDD5;
```

---

## ✍️ TYPOGRAPHY

### **Font Family - Sans-serif Only**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* NO SERIF HEADINGS */
/* NO MONOSPACE UI LABELS */
/* Everything is Inter sans-serif */
```

### **Type Scale**
```css
:root {
  /* Headings (Inter - NOT serif) */
  --text-h1: 30px;        /* Page titles */
  --text-h2: 24px;        /* Section headers */
  --text-h3: 18px;        /* Subsection headers */
  --text-h4: 16px;        /* Card headers */

  /* Body Text */
  --text-lg: 16px;        /* Large body */
  --text-base: 14px;      /* Standard body */
  --text-sm: 13px;        /* Small text */
  --text-xs: 12px;        /* Helper text */

  /* Buttons & Labels (NOT uppercase, NOT monospace) */
  --text-button: 14px;    /* Button text */
  --text-label: 14px;     /* Form labels */
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

### **Typography Usage**
```css
/* Page Title */
h1 {
  font-family: var(--font-family);
  font-size: var(--text-h1);
  font-weight: var(--weight-semibold);
  color: var(--gray-900);
}

/* Section Header */
h2 {
  font-family: var(--font-family);
  font-size: var(--text-h2);
  font-weight: var(--weight-semibold);
  color: var(--gray-900);
}

/* Button Text (regular case, NOT uppercase) */
button {
  font-family: var(--font-family);
  font-size: var(--text-button);
  font-weight: var(--weight-medium);
}

/* Form Label */
label {
  font-family: var(--font-family);
  font-size: var(--text-label);
  font-weight: var(--weight-medium);
  color: var(--gray-700);
}
```

---

## 📏 SPACING SYSTEM

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

---

## 🧩 COMPONENT LIBRARY

### **Buttons**

```css
/* Primary Button - Black (Mem0 style) */
.btn-primary {
  background: var(--black);
  color: var(--white);
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  transition: background 0.2s ease;
}

.btn-primary:hover {
  background: var(--gray-800);
}

/* Secondary/Outline Button */
.btn-secondary {
  background: transparent;
  color: var(--gray-700);
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--gray-300);
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
}

/* Danger Button - Red */
.btn-danger {
  background: var(--danger);
  color: var(--white);
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
}

.btn-danger:hover {
  background: var(--danger-dark);
}

/* Success Button - Green */
.btn-success {
  background: var(--success);
  color: var(--white);
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
}
```

### **Forms & Inputs**

```css
/* Input Label */
.input-label {
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 8px;
  display: block;
}

/* Text Input */
.input {
  font-family: var(--font-family);
  font-size: 14px;
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: 6px;
  padding: 10px 12px;
  width: 100%;
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--gray-400);
}

.input::placeholder {
  color: var(--gray-400);
}

/* Select Dropdown */
.select {
  font-family: var(--font-family);
  font-size: 14px;
  color: var(--gray-900);
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: 6px;
  padding: 10px 12px;
  width: 100%;
}
```

### **Badges & Pills**

```css
/* Badge Base */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-family: var(--font-family);
  font-size: 13px;
  font-weight: 500;
}

/* Badge Variants */
.badge-purple {
  background: var(--badge-purple-light);
  color: var(--badge-purple);
}

.badge-blue {
  background: var(--badge-blue-light);
  color: var(--badge-blue);
}

.badge-green {
  background: var(--badge-green-light);
  color: var(--badge-green);
}

.badge-orange {
  background: var(--badge-orange-light);
  color: var(--badge-orange);
}

/* Badge with Dot Indicator */
.badge-with-dot::before {
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
  font-family: var(--font-family);
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-600);
  text-align: left;
  padding: 12px 16px;
}

/* Table Body */
.table td {
  font-family: var(--font-family);
  font-size: 14px;
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
```

### **Navigation Tabs**

```css
/* Tab Container */
.tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--gray-200);
}

/* Tab Item */
.tab {
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-600);
  padding: 12px 16px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover {
  color: var(--gray-900);
}

.tab-active {
  color: var(--gray-900);
  border-bottom-color: var(--black);
}
```

### **Sidebar Navigation**

```css
.sidebar {
  width: 200px;          /* Narrower than old 256px */
  background: var(--gray-100);
  border-right: 1px solid var(--gray-200);
  height: 100vh;
  overflow-y: auto;
  padding: 16px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-item:hover {
  background: var(--gray-200);
  color: var(--gray-900);
}

.nav-item-active {
  background: var(--white);
  color: var(--gray-900);
}

.nav-icon {
  width: 18px;
  height: 18px;
  opacity: 0.7;
}

.nav-item-active .nav-icon {
  opacity: 1;
}
```

---

## 📐 LAYOUT

```css
/* Main Layout */
.app-layout {
  display: flex;
  height: 100vh;
}

.app-sidebar {
  width: 200px;          /* Key difference: 200px not 256px */
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
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--white);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--gray-50);
}
```

---

## 🔑 KEY DIFFERENCES FROM OLD SYSTEM

### **What Changed:**

| Feature | Old System (RevOS/OpenLegs) | New System (Echo) |
|---------|---------------------------|------------------|
| **Headings** | Libre Baskerville (serif) | Inter (sans-serif) |
| **UI Labels** | JetBrains Mono UPPERCASE | Inter regular case |
| **Primary Button** | Purple (#8B5CF6) | Black (#000000) |
| **Sidebar Width** | 256px | 200px |
| **Typography** | 3 fonts (serif/mono/sans) | 1 font (sans only) |
| **Aesthetic** | Bold, technical, purple-heavy | Clean, minimal, neutral |
| **Button Style** | Uppercase labels, colorful | Regular case, black/white |

### **What Stayed:**
- Badge colors (purple, blue, green, orange)
- Table layouts
- Border radius (6px - 8px)
- Spacing scale (4px increments)
- Light theme focus

---

## ✅ IMPLEMENTATION SUMMARY

**Echo Design System = Mem0 Clone**
- All sans-serif (Inter)
- Black primary buttons
- 200px sidebar
- Clean minimal aesthetic
- Colored badges for categories
- Light gray backgrounds
- Regular case text (no uppercase)

This is a complete departure from the purple/technical RevOS system and adopts Mem0's clean, data-focused design language.

---

## 📝 Document Status

**Date Created**: 2025-11-09
**Status**: Complete & Ready for Implementation
**Replaces**: RevOS_Design_System_FINAL.md (Old system - NOT USED)
**Brand**: Echo Design System (Mem0-inspired, clean & minimal)
