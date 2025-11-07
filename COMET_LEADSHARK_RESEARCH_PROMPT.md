# COMET Browser Research Prompt: Leadshark Campaign Creation UX

**Objective:** Analyze Leadshark's campaign creation flow to replicate design patterns, UX flow, and code structure for Bravo revOS

**Target Application:** Leadshark (leadshark.io)
**Focus Areas:** Campaign/sequence creation flow, form design, responsiveness, animations, code patterns

---

## 🎯 PRIMARY RESEARCH TASKS

### Task 1: Overall Campaign Creation Flow
**What to document:**
1. Navigate to campaign/sequence creation page
2. Screenshot the entire flow (all screens/steps)
3. Document the step progression (breadcrumbs, navigation)
4. Note keyboard behavior (does Enter advance? Tab ordering?)
5. Identify all form sections and their order

**Code snippets to get:**
- Breadcrumb component HTML/CSS
- Step navigation component
- Overall container/layout structure
- Button styling (Continue, Back, Save buttons)

**Questions to answer:**
- How many steps are there?
- Are steps mandatory or skippable?
- Can users go back and edit?
- Are there any animations/transitions between steps?

---

### Task 2: Form Inputs & Styling
**What to document:**
1. Screenshot each input type (text, textarea, file upload, dropdowns, etc.)
2. Hover states for all interactive elements
3. Focus states (keyboard focus indicators)
4. Error states and validation messages
5. Label positioning and styling

**Code snippets to get:**
- Input field styling (padding, height, border-radius, font-size)
- Textarea styling (with character counter if present)
- Placeholder text styling
- Label HTML/CSS
- Error message styling
- Success/validation styling

**Measurements to note:**
- Input min-height
- Padding (top, right, bottom, left)
- Border radius values
- Font sizes and weights
- Line heights
- Letter spacing (especially if it's tight like you mentioned)

---

### Task 3: File Upload Component
**What to document:**
1. Screenshot the file upload area in both states (empty, with file)
2. Drag-drop behavior (does entire box respond to drag?)
3. File preview/thumbnail display
4. Multiple file upload support?
5. Accepted file types displayed

**Code snippets to get:**
- File upload container HTML structure
- Upload box styling (border, background, min-height)
- Icon/text inside upload area
- File preview styling and layout
- Progress bar styling (if files are uploading)
- Error messages for invalid files

**Interactions to test:**
- Click behavior (click anywhere or specific button?)
- Drag-over highlighting
- File selection dialog
- Multiple file handling
- File removal/clearing

---

### Task 4: Message Configuration / DM Flow
**What to document:**
1. Screenshot all message configuration screens
2. How many message sections are there?
3. Order of messages (Immediate, 24h, 48h, etc.)
4. Optional vs required messages
5. Time delay options (how are they presented?)
6. Conditional logic display (if user doesn't respond...)

**Code snippets to get:**
- Message card/section HTML structure
- Time selector component (dropdown? pills? input?)
- Message textarea styling
- Conditional message wrapper
- Toggle/checkbox styling for optional messages
- Message counter (if present)

**Specific questions:**
- How is the 24-hour delay displayed?
- Are message delays editable?
- Can you add/remove messages?
- Is there a template/preset system for messages?
- How are merge tags/variables displayed?

---

### Task 5: Merge Tags / Variables System
**What to document:**
1. How are merge tags shown to users?
2. Are they in a dropdown, pills, or helper text?
3. Can you click them to insert?
4. What variables are available?
5. How does the UI show you what variables exist?

**Code snippets to get:**
- Merge tag button/link styling
- Merge tag list/dropdown component
- Merge tag insertion mechanism
- Variable display in messages (syntax: `{var}` or `{{var}}`?)
- Helper text for variables

**Example variables to look for:**
- First name / Full name
- Email
- Campaign name
- Lead magnet title
- Custom fields
- Company name
- etc.

---

### Task 6: Responsive Design Approach
**What to document:**
1. Test at 3 breakpoints:
   - Mobile: 375px width
   - Tablet: 768px width
   - Desktop: 1440px width

2. For each breakpoint, screenshot:
   - How breadcrumbs display (full text vs numbers only?)
   - Form input sizing
   - Button sizing and spacing
   - File upload box sizing
   - Message sections layout
   - Any hidden/shown elements

**Code snippets to get:**
- CSS media queries (what breakpoints are used?)
- Tailwind breakpoint utility classes (if Tailwind)
- Responsive grid/flex layouts
- Hidden/visible classes

**Specific responsive questions:**
- Do breadcrumbs collapse to numbers below 900px?
- Are side-by-side sections stacked on mobile?
- How are large file upload areas handled on small screens?
- Are buttons full-width or fixed on mobile?

---

### Task 7: Colors, Spacing & Visual Design
**What to document:**
1. Screenshot color palette (buttons, text, backgrounds, borders)
2. Spacing/padding measurements (consistent units?)
3. Border styling (colors, widths, radius values)
4. Shadow effects (you want to avoid these - but document them to know what NOT to use)
5. Hover/active state color changes

**Code snippets to get:**
- Color values (hex, rgb, CSS variables)
- Padding/margin values
- Border definitions
- Box-shadow values (to explicitly NOT replicate)
- Opacity values for faded text/backgrounds
- Transition/animation timing

**Visual design notes:**
- What's the primary color? Secondary?
- What colors are used for success/error/warning?
- Is white space generous or compact?
- Are there dividers between sections?
- How much visual hierarchy is there?

---

### Task 8: Animations & Interactions
**What to document:**
1. Page transitions between steps
2. Button hover animations
3. Input focus animations
4. Dropdown opening/closing
5. Error message appearance
6. Success state transitions
7. Loading states (spinners, skeleton loaders?)

**Code snippets to get:**
- CSS transitions (duration, easing)
- CSS animations (keyframes)
- Tailwind animation classes used
- JavaScript animation libraries (Framer Motion? React Spring?)
- Hover state definitions
- Focus state definitions

**Interaction questions:**
- Are transitions smooth or instant?
- Do elements fade in or slide in?
- Are there micro-interactions on button hover?
- Is there visual feedback when form is validating?
- Are there success animations/celebrations?

---

### Task 9: Keyboard Navigation & Accessibility
**What to document:**
1. Test Tab key navigation (does it move through inputs logically?)
2. Test Enter key (does it submit forms? Advance steps?)
3. Focus indicators (visible blue outline? Custom styling?)
4. Keyboard shortcuts (if any)
5. Label associations (are inputs properly labeled?)

**Code snippets to get:**
- Tabindex attributes (if custom ordering)
- onKeyDown handlers
- Focus styling
- ARIA labels (if present)
- Button type attributes (submit vs button)

**Keyboard testing:**
- Can you navigate entire form without mouse?
- Does Enter key advance to next step?
- Can you click buttons with Spacebar?
- Are there any keyboard shortcuts?

---

### Task 10: Code Structure & Architecture
**What to document:**
1. Are they using React components or vanilla JS?
2. Component naming patterns (CampaignStep, MessageCard, etc.)
3. State management (useState, Redux, Zustand?)
4. Form handling library (React Hook Form, Formik, etc.)
5. UI component library (shadcn/ui, Radix, Material-UI, custom?)

**Code snippets to get:**
- Component file structure (paste whole component if < 200 lines)
- Import statements (what libraries are they using?)
- State management patterns
- Event handler patterns
- Form validation approach
- API call patterns

**Architecture questions:**
- Is it a single-page form or step-by-step wizard?
- How is data persisted between steps?
- Are there API calls during the form or only at the end?
- How are errors handled?

---

## 📋 WHAT NOT TO COPY

❌ **Explicitly Exclude:**
- Font families and font stack (we're keeping Inter)
- Box shadows (you want flat design)
- Custom animations that feel overly complex
- Any proprietary/branded styling

✅ **DO Copy/Replicate:**
- Layout structure and spacing
- Form input styling (without shadows)
- Responsive breakpoints and behavior
- Keyboard navigation patterns
- Color contrast and readability
- Button styling and states
- Component hierarchy
- Data flow patterns

---

## 🎯 DELIVERABLES

By the end of this research, provide:

1. **Screenshots:**
   - Full campaign creation flow (all screens)
   - Responsive views (mobile, tablet, desktop)
   - All form input states (empty, filled, focused, error)
   - Message configuration details

2. **Code Snippets:**
   - All component HTML/CSS structures
   - Key styling values (colors, spacing, sizes)
   - JavaScript interaction patterns
   - Animation/transition definitions

3. **Design Document:**
   - Color palette with hex values
   - Spacing/sizing system (padding, margins, gaps)
   - Typography settings (sizes, weights, line-heights)
   - Responsive breakpoints and behaviors
   - Component state styling (hover, focus, active, disabled, error)

4. **Flow Documentation:**
   - Step-by-step narrative of the creation process
   - Keyboard navigation flow
   - Branching logic (conditional messages, optional sections)
   - Data structure for submitted campaigns

5. **Implementation Notes:**
   - Best practices observed
   - Patterns that work well (reusable approaches)
   - Things that should be improved
   - Performance optimizations noticed

---

## 🚀 RESEARCH EXECUTION

**Browser Tools to Use:**
- Inspector (F12) to examine HTML/CSS
- Network tab to see API calls
- Console to run JavaScript snippets
- Responsive design mode (Ctrl+Shift+M) to test breakpoints

**Tip:** Right-click and "Inspect Element" on specific components to see their exact styling.

**Time Estimate:** 30-45 minutes to thoroughly document all areas

---

## 📝 Notes

- **Font:** Keep our Inter (or Inter Tight/Compact for tighter kerning) - do NOT copy their fonts
- **Shadows:** Document shadow values so we KNOW what NOT to use
- **Responsiveness:** Special focus on how they handle <900px viewport
- **DM Messages:** Pay special attention to how they structure message configuration
- **Merge Tags:** Document exactly how variables/merge tags are presented and inserted
- **Keyboard:** Test Enter key behavior extensively - this is critical for UX

---

## ✅ Success Criteria

You'll know you've completed this when you can answer:
1. ✅ What are all the steps in their campaign creation flow?
2. ✅ How does their DM message configuration work (structure, time delays, presets)?
3. ✅ What exact colors, spacing, and sizing values do they use?
4. ✅ How do they handle responsiveness below 900px?
5. ✅ What keyboard interactions are supported?
6. ✅ What libraries/patterns are they using for components and forms?
7. ✅ How are merge tags/variables presented to users?
8. ✅ What animations/transitions exist (and should we replicate)?

---

**Research Date:** 2025-11-07
**Project:** Bravo revOS Campaign Creation Redesign
**Reference:** Leadshark.io campaign/sequence creation
