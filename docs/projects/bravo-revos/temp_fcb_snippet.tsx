      case 'schedule':
        // TODO: Implement schedule post
        toast.info('Schedule post - Coming soon!');
        break;
      default:
        // Generic action handling (e.g., Topic Selection from WriteChip)
        // If it's not a system command, assume it's a user selection and send it as a message
        console.log('[FCB] Handling generic action as user message:', action);
        
        // Use a clearer, natural language format for the AI
        // If the action is a slug like "talent_myth", the AI might prefer "I select the topic: talent_myth"
        const messageText = `I select the topic: ${action}`;
        
        // Update input and submit
        // Note: setInput is async, so we use a timeout to ensure state update before submit
        setInput(messageText);
        
        setTimeout(() => {
           // Try to use native form submission if ref exists
           if (floatingBarRef.current) {
             floatingBarRef.current.requestSubmit();
           } else {
             // Fallback
             handleSubmit(new Event('submit') as any);
           }
        }, 100);
        
        break;
    }
  };