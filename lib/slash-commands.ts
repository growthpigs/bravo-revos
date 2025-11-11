/**
 * Slash Commands Registry
 * Cursor-style slash commands for fast LinkedIn campaign workflows
 */

export interface SlashCommand {
  name: string;
  description: string;
  category: 'content' | 'campaign' | 'pod' | 'utility';
  args?: string; // e.g., "[topic]" or "<required-arg>"
  icon?: string; // Emoji icon for visual category
  aliases?: string[]; // Alternative command names
  handler: (args: string, context: SlashCommandContext) => void;
}

export interface SlashCommandContext {
  sendMessage: (message: string) => Promise<void>;
  clearInput: () => void;
  setFullscreen: (enabled: boolean) => void;
  clearMessages: () => void;
}

/**
 * All available slash commands
 */
export const slashCommands: SlashCommand[] = [
  // ===== CONTENT COMMANDS =====
  {
    name: 'write',
    description: 'Start writing a post (shows campaign selector)',
    category: 'content',
    icon: '✍️',
    handler: async (args, ctx) => {
      await ctx.sendMessage('write a post');
      ctx.clearInput();
    },
  },
  {
    name: 'generate',
    description: 'Generate content about a specific topic',
    category: 'content',
    args: '[topic]',
    icon: '✨',
    handler: async (args, ctx) => {
      const topic = args.trim();
      if (topic) {
        await ctx.sendMessage(`generate a post about ${topic}`);
      } else {
        await ctx.sendMessage('generate content');
      }
      ctx.clearInput();
    },
  },
  {
    name: 'refine',
    description: 'Improve and polish the current draft',
    category: 'content',
    icon: '💎',
    handler: async (args, ctx) => {
      await ctx.sendMessage('refine this draft and make it better');
      ctx.clearInput();
    },
  },
  {
    name: 'continue',
    description: 'Continue writing from current draft',
    category: 'content',
    icon: '➡️',
    handler: async (args, ctx) => {
      await ctx.sendMessage('continue writing');
      ctx.clearInput();
    },
  },
  {
    name: 'rewrite',
    description: 'Rewrite content in different style',
    category: 'content',
    args: '[style]',
    icon: '🔄',
    handler: async (args, ctx) => {
      const style = args.trim() || 'professional';
      await ctx.sendMessage(`rewrite this in a ${style} style`);
      ctx.clearInput();
    },
  },

  // ===== CAMPAIGN COMMANDS =====
  {
    name: 'li-campaign',
    description: 'Launch a LinkedIn campaign (select → pod → content → post)',
    category: 'campaign',
    icon: '🚀',
    aliases: ['launch', 'campaign'],
    handler: async (args, ctx) => {
      await ctx.sendMessage('launch campaign');
      ctx.clearInput();
    },
  },
  {
    name: 'campaigns',
    description: 'Show all your campaigns with stats',
    category: 'campaign',
    icon: '📊',
    handler: async (args, ctx) => {
      await ctx.sendMessage('show me my campaigns');
      ctx.clearInput();
    },
  },

  // ===== POD COMMANDS =====
  {
    name: 'pod-members',
    description: 'Show who\'s in your engagement pod',
    category: 'pod',
    icon: '👥',
    handler: async (args, ctx) => {
      await ctx.sendMessage('show pod members');
      ctx.clearInput();
    },
  },
  {
    name: 'pod-share',
    description: 'Share your latest post with pod for reposts',
    category: 'pod',
    icon: '🔗',
    handler: async (args, ctx) => {
      await ctx.sendMessage('share with pod');
      ctx.clearInput();
    },
  },
  {
    name: 'pod-engage',
    description: 'Get repost links from pod to engage with',
    category: 'pod',
    icon: '💬',
    handler: async (args, ctx) => {
      await ctx.sendMessage('show pod repost links');
      ctx.clearInput();
    },
  },
  {
    name: 'pod-stats',
    description: 'Show pod engagement statistics',
    category: 'pod',
    icon: '📈',
    handler: async (args, ctx) => {
      await ctx.sendMessage('show pod stats');
      ctx.clearInput();
    },
  },

  // ===== UTILITY COMMANDS =====
  {
    name: 'help',
    description: 'Show all available commands',
    category: 'utility',
    icon: '❓',
    handler: (args, ctx) => {
      // Don't send message - will show help UI inline
      const helpText = generateHelpText();
      ctx.sendMessage(helpText);
      ctx.clearInput();
    },
  },
  {
    name: 'clear',
    description: 'Clear conversation history',
    category: 'utility',
    icon: '🗑️',
    handler: (args, ctx) => {
      ctx.clearMessages();
      ctx.clearInput();
    },
  },
  {
    name: 'fullscreen',
    description: 'Toggle fullscreen working documents mode',
    category: 'utility',
    icon: '⛶',
    aliases: ['fs'],
    handler: (args, ctx) => {
      // Toggle fullscreen - handled by FloatingChatBar
      ctx.setFullscreen(true);
      ctx.clearInput();
    },
  },
];

/**
 * Search commands by query (fuzzy matching)
 */
export function searchCommands(query: string): SlashCommand[] {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return slashCommands;
  }

  return slashCommands.filter((cmd) => {
    // Match command name
    if (cmd.name.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Match aliases
    if (cmd.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    // Match description keywords
    if (cmd.description.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    return false;
  });
}

/**
 * Get command by exact name or alias
 */
export function getCommand(name: string): SlashCommand | undefined {
  const lowerName = name.toLowerCase();

  return slashCommands.find((cmd) => {
    if (cmd.name.toLowerCase() === lowerName) {
      return true;
    }

    if (cmd.aliases?.some(alias => alias.toLowerCase() === lowerName)) {
      return true;
    }

    return false;
  });
}

/**
 * Generate help text showing all commands
 */
function generateHelpText(): string {
  const categories = {
    content: '📝 Content Commands',
    campaign: '🎯 Campaign Commands',
    pod: '👥 Pod Commands',
    utility: '⚙️ Utility Commands',
  };

  let helpText = '## Available Slash Commands\n\n';

  Object.entries(categories).forEach(([category, title]) => {
    const commands = slashCommands.filter(cmd => cmd.category === category);

    if (commands.length > 0) {
      helpText += `### ${title}\n\n`;

      commands.forEach((cmd) => {
        const args = cmd.args ? ` ${cmd.args}` : '';
        const aliases = cmd.aliases ? ` (alias: ${cmd.aliases.join(', ')})` : '';
        helpText += `**/${cmd.name}${args}**${aliases}\n${cmd.description}\n\n`;
      });
    }
  });

  helpText += '\n💡 **Tip**: Type `/` to see all commands, or start typing to filter.\n';

  return helpText;
}
