import os

file_path = "../../../components/chat/FloatingChatBar.tsx"

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
handle_action_click_fixed = False

# The code we want to insert into handleActionClick before the default warning
new_case_logic = """      case 'schedule':
        // TODO: Implement schedule post
        toast.info('Schedule post - Coming soon!');
        break;
      default:
        // Generic action handling (e.g. Topic Selection)
        console.log('[FCB] Handling generic action as user message:', action);
        setInput(`I select the topic: ${action}`);
        setTimeout(() => {
           if (floatingBarRef.current) {
             floatingBarRef.current.requestSubmit();
           } else {
             handleSubmit(new Event('submit') as any);
           }
        }, 0);
        break;
"""

for i, line in enumerate(lines):
    # 1. Detect where to insert the new logic in handleActionClick
    # We look for the old default case which just warned
    if "console.warn('[FCB] Unknown action:', action);" in line and not handle_action_click_fixed:
        # We replace the simple warning with our new logic (which includes a break)
        # Note: The original code had 'default:' on the line before. 
        # Let's find 'default:' instead to be safer? 
        # Actually, let's just insert BEFORE the closing brace of the switch if possible,
        # OR just replace the specific 'default' block if we can match it.
        pass
    
    # Let's try a different strategy:
    # 1. Strip the BAD lines from handleSubmit
    # 2. Rewrite the switch in handleActionClick entirely? No, too risky.
    
    pass

# Strategy 2: Reconstruction
# We know the file structure.
# handleActionClick ends around line 700.
# handleSubmit starts around line 715.

cleaned_lines = []
in_handle_submit_garbage = False

for line in lines:
    # 1. Inject the missing cases into handleActionClick
    # The signal is the 'default:' case in handleActionClick.
    if "default:" in line and "console.warn" in lines[lines.index(line)+1]:
        # This is the old default case in handleActionClick. We want to replace it.
        cleaned_lines.append(new_case_logic)
        # We skip the next line which is the console.warn
        # And we need to consume the lines until the end of the switch?
        # Actually, the old code was:
        # default:
        #   console.warn(...);
        # }
        continue
    
    if "console.warn('[FCB] Unknown action:', action);" in line:
        continue # Skipped because we handled it above

    # 2. Remove garbage from handleSubmit
    # The garbage starts with "case 'schedule':" inside handleSubmit
    if "case 'schedule':" in line and "toast.info" in lines[lines.index(line)+2]:
        in_handle_submit_garbage = True
        continue
    
    if in_handle_submit_garbage:
        if "break;" in line:
             in_handle_submit_garbage = False
        continue

    # Special check for the closing brace of the garbage default block if it exists
    if "setTimeout" in line and in_handle_submit_garbage:
        continue
        
    cleaned_lines.append(line)

# Let's try a simpler robust string replacement since we know the exact context from previous reads.
# The file content is in 'lines'.

content = "".join(lines)

# 1. Remove the garbage from handleSubmit
garbage_pattern = """      case 'schedule':
        // TODO: Implement schedule post
        toast.info('Schedule post - Coming soon!');
        break;
      default:
        // Generic action handling (e.g., Topic Selection from WriteChip)
        // If it's not a system command, assume it's a user selection and send it as a message
        console.log('[FCB] Handling generic action as user message:', action);

        // Use a clearer, natural language format for the AI
        // If the action is a slug like "talent_myth", the AI might prefer "I select the topic: talent_myth"
        const messageText = ;

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
  };"""

# The garbage might not match exactly due to whitespace or escaping in my previous replace call.
# But we know it's there.

# The safest way is to replace the "Old Default" in handleActionClick with "New Logic"
# AND delete the "Accidental Block" in handleSubmit.

# Old Default Block in handleActionClick
old_default = """      default:
        console.warn('[FCB] Unknown action:', action);
    }
  };"""

new_logic = """      case 'schedule':
        // TODO: Implement schedule post
        toast.info('Schedule post - Coming soon!');
        break;
      default:
        console.log('[FCB] Handling generic action:', action);
        setInput(`I select the topic: ${action}`);
        setTimeout(() => {
           if (floatingBarRef.current) {
             floatingBarRef.current.requestSubmit();
           } else {
             handleSubmit(new Event('submit') as any);
           }
        }, 0);
        break;
    }
  };"""

# Replace the valid old default with the new logic
if old_default in content:
    content = content.replace(old_default, new_logic)
else:
    # If indentation is different, try to be more flexible?
    # Or maybe I already partly modified it?
    pass

# Now find and remove the garbage in handleSubmit.
# The garbage ends with a syntax error "case ...".
# It was inserted right after:
#     console.log('[HGC_STREAM] ========================================');
#
#     case 'schedule':

split_marker = "console.log('[HGC_STREAM] ========================================');"
parts = content.split(split_marker)

if len(parts) >= 3:
    # parts[0] is everything before handleSubmit logs
    # parts[1] is between the two logs
    # parts[2] starts with the garbage
    
    # We want to keep parts[0] and parts[1]
    # In parts[2], we want to strip the garbage until the real code resumes.
    # The real code resumes at:
    #     // Create new conversation if needed
    #     if (!currentConversationId) {
    
    garbage_end_marker = "if (!currentConversationId) {"
    
    post_garbage_parts = parts[2].split(garbage_end_marker)
    if len(post_garbage_parts) > 1:
        # Reassemble:
        # 1. Everything up to the logs
        # 2. The logs (re-adding the marker)
        # 3. The cleaned part of handleSubmit (skipping the garbage)
        
        # post_garbage_parts[0] contains the garbage. We discard it.
        # post_garbage_parts[1] contains the rest of the file.
        
        new_content = parts[0] + split_marker + parts[1] + split_marker + "\n\n    e.preventDefault();\n    if (!input.trim() || isLoading) {\n      return;\n    }\n\n    " + garbage_end_marker + post_garbage_parts[1]
        
        # Note: I added back the e.preventDefault checks which might have been lost or were before the garbage?
        # Let's check where the garbage started.
        # It started IMMEDIATELY after the logs.
        # The original code had:
        #    e.preventDefault();
        #    if (!input.trim() || isLoading) {
        
        with open(file_path, 'w') as f:
            f.write(new_content)
            print("File repaired successfully.")
    else:
        print("Could not find garbage end marker.")
else:
    print("Could not find split marker.")

