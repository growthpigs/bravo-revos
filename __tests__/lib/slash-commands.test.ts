/**
 * Unit Tests for Slash Commands Registry
 * Tests: searchCommands(), getCommand(), command handlers
 */

import {
  slashCommands,
  searchCommands,
  getCommand,
  SlashCommandContext,
} from '@/lib/slash-commands';

describe('Slash Commands Registry', () => {
  // Mock context for handler testing
  let mockContext: jest.Mocked<SlashCommandContext>;

  beforeEach(() => {
    mockContext = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      clearInput: jest.fn(),
      setFullscreen: jest.fn(),
      clearMessages: jest.fn(),
      clearDocument: jest.fn(),
    };
  });

  describe('searchCommands()', () => {
    it('should return all commands when query is empty', () => {
      const results = searchCommands('');
      expect(results).toHaveLength(slashCommands.length);
      expect(results).toEqual(slashCommands);
    });

    it('should filter by command name', () => {
      const results = searchCommands('write');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((cmd) => cmd.name === 'write')).toBe(true);
      expect(results.some((cmd) => cmd.name === 'rewrite')).toBe(true); // Contains "write"
    });

    it('should filter by alias', () => {
      const results = searchCommands('launch');
      expect(results.length).toBeGreaterThan(0);
      const liCampaignCmd = results.find((cmd) => cmd.name === 'li-campaign');
      expect(liCampaignCmd).toBeDefined();
      expect(liCampaignCmd?.aliases).toContain('launch');
    });

    it('should filter by description', () => {
      const results = searchCommands('engagement');
      expect(results.length).toBeGreaterThan(0);
      const podStatsCmd = results.find((cmd) => cmd.name === 'pod-stats');
      expect(podStatsCmd).toBeDefined();
      expect(podStatsCmd?.description.toLowerCase()).toContain('engagement');
    });

    it('should be case-insensitive', () => {
      const lowerResults = searchCommands('pod');
      const upperResults = searchCommands('POD');
      expect(lowerResults).toEqual(upperResults);
    });

    it('should return empty array when no matches', () => {
      const results = searchCommands('nonexistent-command-xyz');
      expect(results).toEqual([]);
    });

    it('should trim whitespace from query', () => {
      const results = searchCommands('  write  ');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((cmd) => cmd.name === 'write')).toBe(true);
    });
  });

  describe('getCommand()', () => {
    it('should find command by exact name', () => {
      const cmd = getCommand('write');
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe('write');
    });

    it('should find command by alias', () => {
      const cmd = getCommand('launch');
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe('li-campaign');
      expect(cmd?.aliases).toContain('launch');
    });

    it('should be case-insensitive', () => {
      const cmd1 = getCommand('write');
      const cmd2 = getCommand('WRITE');
      expect(cmd1).toEqual(cmd2);
    });

    it('should return undefined for non-existent command', () => {
      const cmd = getCommand('nonexistent');
      expect(cmd).toBeUndefined();
    });

    it('should handle empty string', () => {
      const cmd = getCommand('');
      expect(cmd).toBeUndefined();
    });
  });

  describe('Command Handlers', () => {
    describe('/write command', () => {
      it('should clear document, enable fullscreen, send message, clear input', async () => {
        const writeCmd = getCommand('write');
        expect(writeCmd).toBeDefined();

        await writeCmd!.handler('', mockContext);

        expect(mockContext.clearDocument).toHaveBeenCalledTimes(1);
        expect(mockContext.setFullscreen).toHaveBeenCalledWith(true);
        expect(mockContext.sendMessage).toHaveBeenCalledWith('/write');
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });

      it('should include args in message when provided', async () => {
        const writeCmd = getCommand('write');
        await writeCmd!.handler('about AI', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/write about AI');
      });

      it('should call context methods in correct order', async () => {
        const writeCmd = getCommand('write');
        const callOrder: string[] = [];

        mockContext.clearDocument.mockImplementation(() => {
          callOrder.push('clearDocument');
        });
        mockContext.setFullscreen.mockImplementation(() => {
          callOrder.push('setFullscreen');
        });
        mockContext.sendMessage.mockImplementation(async () => {
          callOrder.push('sendMessage');
        });
        mockContext.clearInput.mockImplementation(() => {
          callOrder.push('clearInput');
        });

        await writeCmd!.handler('', mockContext);

        expect(callOrder).toEqual([
          'clearDocument',
          'setFullscreen',
          'sendMessage',
          'clearInput',
        ]);
      });
    });

    describe('/generate command', () => {
      it('should send message with command text', async () => {
        const generateCmd = getCommand('generate');
        await generateCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/generate');
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });

      it('should include args in message', async () => {
        const generateCmd = getCommand('generate');
        await generateCmd!.handler('marketing tips', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith(
          '/generate marketing tips'
        );
      });

      it('should NOT clear document or enable fullscreen', async () => {
        const generateCmd = getCommand('generate');
        await generateCmd!.handler('', mockContext);

        expect(mockContext.clearDocument).not.toHaveBeenCalled();
        expect(mockContext.setFullscreen).not.toHaveBeenCalled();
      });
    });

    describe('/refine command', () => {
      it('should send exact command text', async () => {
        const refineCmd = getCommand('refine');
        await refineCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/refine');
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });

      it('should ignore args (command takes no args)', async () => {
        const refineCmd = getCommand('refine');
        await refineCmd!.handler('extra args', mockContext);

        // Should send just /refine, not include args
        expect(mockContext.sendMessage).toHaveBeenCalledWith('/refine');
      });
    });

    describe('/continue command', () => {
      it('should send exact command text', async () => {
        const continueCmd = getCommand('continue');
        await continueCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/continue');
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });
    });

    describe('/rewrite command', () => {
      it('should send command without args', async () => {
        const rewriteCmd = getCommand('rewrite');
        await rewriteCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/rewrite');
      });

      it('should include style argument', async () => {
        const rewriteCmd = getCommand('rewrite');
        await rewriteCmd!.handler('professional', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith(
          '/rewrite professional'
        );
      });
    });

    describe('/li-campaign command', () => {
      it('should send exact command text', async () => {
        const campaignCmd = getCommand('li-campaign');
        await campaignCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/li-campaign');
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });

      it('should be accessible via "launch" alias', async () => {
        const campaignCmd = getCommand('launch');
        expect(campaignCmd).toBeDefined();
        expect(campaignCmd?.name).toBe('li-campaign');
      });

      it('should be accessible via "campaign" alias', async () => {
        const campaignCmd = getCommand('campaign');
        expect(campaignCmd).toBeDefined();
        expect(campaignCmd?.name).toBe('li-campaign');
      });
    });

    describe('/campaigns command', () => {
      it('should send exact command text', async () => {
        const campaignsCmd = getCommand('campaigns');
        await campaignsCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/campaigns');
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });
    });

    describe('/pod-members command', () => {
      it('should send exact command text', async () => {
        const podMembersCmd = getCommand('pod-members');
        await podMembersCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/pod-members');
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });
    });

    describe('/pod-share command', () => {
      it('should send exact command text', async () => {
        const podShareCmd = getCommand('pod-share');
        await podShareCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/pod-share');
      });
    });

    describe('/pod-engage command', () => {
      it('should send exact command text', async () => {
        const podEngageCmd = getCommand('pod-engage');
        await podEngageCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/pod-engage');
      });
    });

    describe('/pod-stats command', () => {
      it('should send exact command text', async () => {
        const podStatsCmd = getCommand('pod-stats');
        await podStatsCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledWith('/pod-stats');
      });
    });

    describe('/help command', () => {
      it('should send help text via sendMessage', async () => {
        const helpCmd = getCommand('help');
        await helpCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).toHaveBeenCalledTimes(1);
        const helpMessage = mockContext.sendMessage.mock.calls[0][0];
        expect(helpMessage).toContain('/help');
        expect(helpMessage).toContain('Available Slash Commands');
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });

      it('should include command categories in help text', async () => {
        const helpCmd = getCommand('help');
        await helpCmd!.handler('', mockContext);

        const helpMessage = mockContext.sendMessage.mock.calls[0][0];
        expect(helpMessage).toContain('Content');
        expect(helpMessage).toContain('Campaign');
        expect(helpMessage).toContain('Pod');
        expect(helpMessage).toContain('Utility');
      });
    });

    describe('/clear command', () => {
      it('should clear messages and input', () => {
        const clearCmd = getCommand('clear');
        clearCmd!.handler('', mockContext);

        expect(mockContext.clearMessages).toHaveBeenCalledTimes(1);
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });

      it('should NOT send message to chat', () => {
        const clearCmd = getCommand('clear');
        clearCmd!.handler('', mockContext);

        expect(mockContext.sendMessage).not.toHaveBeenCalled();
      });
    });

    describe('/fullscreen command', () => {
      it('should enable fullscreen mode', () => {
        const fullscreenCmd = getCommand('fullscreen');
        fullscreenCmd!.handler('', mockContext);

        expect(mockContext.setFullscreen).toHaveBeenCalledWith(true);
        expect(mockContext.clearInput).toHaveBeenCalledTimes(1);
      });

      it('should be accessible via "fs" alias', () => {
        const fsCmd = getCommand('fs');
        expect(fsCmd).toBeDefined();
        expect(fsCmd?.name).toBe('fullscreen');
      });
    });
  });

  describe('Command Structure Validation', () => {
    it('should have 14 commands total', () => {
      expect(slashCommands).toHaveLength(14);
    });

    it('should have 4 categories', () => {
      const categories = new Set(slashCommands.map((cmd) => cmd.category));
      expect(categories.size).toBe(4);
      expect(categories.has('content')).toBe(true);
      expect(categories.has('campaign')).toBe(true);
      expect(categories.has('pod')).toBe(true);
      expect(categories.has('utility')).toBe(true);
    });

    it('should have unique command names', () => {
      const names = slashCommands.map((cmd) => cmd.name);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    it('should have all required properties', () => {
      slashCommands.forEach((cmd) => {
        expect(cmd).toHaveProperty('name');
        expect(cmd).toHaveProperty('description');
        expect(cmd).toHaveProperty('category');
        expect(cmd).toHaveProperty('handler');
        expect(typeof cmd.name).toBe('string');
        expect(typeof cmd.description).toBe('string');
        expect(typeof cmd.handler).toBe('function');
      });
    });

    it('should have content commands', () => {
      const contentCommands = slashCommands.filter(
        (cmd) => cmd.category === 'content'
      );
      expect(contentCommands.length).toBe(5);
      const names = contentCommands.map((cmd) => cmd.name);
      expect(names).toContain('write');
      expect(names).toContain('generate');
      expect(names).toContain('refine');
      expect(names).toContain('continue');
      expect(names).toContain('rewrite');
    });

    it('should have campaign commands', () => {
      const campaignCommands = slashCommands.filter(
        (cmd) => cmd.category === 'campaign'
      );
      expect(campaignCommands.length).toBe(2);
      const names = campaignCommands.map((cmd) => cmd.name);
      expect(names).toContain('li-campaign');
      expect(names).toContain('campaigns');
    });

    it('should have pod commands', () => {
      const podCommands = slashCommands.filter(
        (cmd) => cmd.category === 'pod'
      );
      expect(podCommands.length).toBe(4);
      const names = podCommands.map((cmd) => cmd.name);
      expect(names).toContain('pod-members');
      expect(names).toContain('pod-share');
      expect(names).toContain('pod-engage');
      expect(names).toContain('pod-stats');
    });

    it('should have utility commands (help, clear, fullscreen)', () => {
      const utilityCommands = slashCommands.filter(
        (cmd) => cmd.category === 'utility'
      );
      expect(utilityCommands.length).toBe(3);
      const names = utilityCommands.map((cmd) => cmd.name);
      expect(names).toContain('help');
      expect(names).toContain('clear');
      expect(names).toContain('fullscreen');
    });
  });
});
