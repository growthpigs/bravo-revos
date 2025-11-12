/**
 * Template Mapper
 * Converts lead magnet library templates to Smart Builder Q&A answers
 */

export interface LeadMagnetTemplate {
  id: string;
  library_id: number;
  title: string;
  description: string | null;
  url: string;
  category: string | null;
  is_active: boolean;
}

export interface SmartBuilderAnswers {
  problem: string;
  solution: string;
  format: 'pdf' | 'template' | 'checklist' | 'swipefile';
  outcome: string;
  delivery: 'email-capture' | 'direct-link';
}

/**
 * Maps lead magnet template to Smart Builder pre-filled answers
 */
export function mapTemplateToAnswers(template: LeadMagnetTemplate): SmartBuilderAnswers {
  // Map category to format
  const formatMap: Record<string, SmartBuilderAnswers['format']> = {
    'Templates': 'template',
    'Checklists': 'checklist',
    'Swipefiles': 'swipefile',
    'Guides': 'pdf',
    'Worksheets': 'template',
    'Toolkits': 'pdf',
    'Scripts': 'swipefile',
    'Resources': 'pdf',
  };

  const format = template.category
    ? (formatMap[template.category] || 'pdf')
    : 'pdf';

  // Extract problem from title (usually in format "How to...")
  const problem = extractProblemFromTitle(template.title);

  // Use description as solution, or generate from title
  const solution = template.description
    ? template.description
    : `Access a comprehensive ${template.title.toLowerCase()} to help you achieve your goals`;

  // Generate outcome based on format and title
  const outcome = generateOutcome(template.title, format);

  // Default to email capture for most templates
  const delivery = 'email-capture' as const;

  return {
    problem,
    solution,
    format,
    outcome,
    delivery,
  };
}

/**
 * Extract problem statement from template title
 */
function extractProblemFromTitle(title: string): string {
  const lowerTitle = title.toLowerCase();

  // Common patterns
  if (lowerTitle.startsWith('how to')) {
    return `Struggling with ${title.replace(/^How to /i, '').toLowerCase()}`;
  }

  if (lowerTitle.includes('guide')) {
    return `Need guidance on ${title.replace(/Guide/i, '').trim().toLowerCase()}`;
  }

  if (lowerTitle.includes('template')) {
    return `Looking for a proven ${title.toLowerCase()} to save time`;
  }

  if (lowerTitle.includes('checklist')) {
    return `Want to ensure nothing is missed when ${extractAction(title)}`;
  }

  // Default: general problem statement
  return `Looking to improve their approach to ${title.toLowerCase()}`;
}

/**
 * Extract action from title for checklist-type templates
 */
function extractAction(title: string): string {
  const words = title.toLowerCase().split(' ');
  const actionWords = ['planning', 'creating', 'building', 'designing', 'launching'];

  for (const word of words) {
    if (actionWords.some(action => word.includes(action))) {
      return word + ' ' + words.slice(words.indexOf(word) + 1).join(' ');
    }
  }

  return 'working on ' + title.toLowerCase();
}

/**
 * Generate outcome based on format and title
 */
function generateOutcome(title: string, format: SmartBuilderAnswers['format']): string {
  const outcomeMap: Record<SmartBuilderAnswers['format'], string> = {
    'pdf': `Comprehensive guide with actionable steps to master ${title.toLowerCase()}`,
    'template': `Ready-to-use ${title.toLowerCase()} that can be implemented immediately`,
    'checklist': `Step-by-step ${title.toLowerCase()} ensuring nothing is overlooked`,
    'swipefile': `Proven ${title.toLowerCase()} examples and templates to adapt for your needs`,
  };

  return outcomeMap[format];
}

/**
 * Convert Smart Builder answers to offering data structure
 */
export interface OfferingData {
  name: string;
  elevator_pitch: string;
  key_benefits: string[];
  objection_handlers: Record<string, string>;
  qualification_questions: string[];
  proof_points: Array<{ metric: string; value: string }>;
}

export function answersToOffering(
  answers: SmartBuilderAnswers,
  template?: LeadMagnetTemplate
): OfferingData {
  const name = template?.title || `${answers.format} - ${answers.problem}`;

  const elevator_pitch = answers.solution;

  const key_benefits = [
    answers.outcome,
    `Delivered as ${formatToDeliveryText(answers.format)}`,
    `Access via ${answers.delivery === 'email-capture' ? 'instant email delivery' : 'direct download link'}`,
  ];

  const objection_handlers = {
    "Is this relevant to me?": answers.problem,
    "How will this help?": answers.outcome,
    "Why should I trust this?": template?.description || "Proven template used by thousands",
  };

  const qualification_questions = [
    `Are you currently facing: ${answers.problem}?`,
    `Would ${answers.outcome.toLowerCase()} be valuable to you?`,
  ];

  const proof_points = template
    ? [{ metric: "Template from library", value: template.title }]
    : [{ metric: "Format", value: answers.format }];

  return {
    name,
    elevator_pitch,
    key_benefits,
    objection_handlers,
    qualification_questions,
    proof_points,
  };
}

/**
 * Convert format enum to human-readable text
 */
function formatToDeliveryText(format: SmartBuilderAnswers['format']): string {
  const formatText: Record<SmartBuilderAnswers['format'], string> = {
    'pdf': 'a downloadable PDF guide',
    'template': 'an editable template',
    'checklist': 'a printable checklist',
    'swipefile': 'example swipefiles and templates',
  };

  return formatText[format];
}
