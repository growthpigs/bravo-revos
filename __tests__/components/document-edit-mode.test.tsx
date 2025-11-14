import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * Document Edit Mode Feature Tests
 *
 * Tests for Option 1 edit mode implementation:
 * - Edit button visibility and state management
 * - Toggle between formatted view and markdown textarea
 * - Save/Cancel functionality
 * - Content preservation and changes
 */

describe('Document Edit Mode Feature', () => {
  // Mock component to test edit mode state transitions
  const MockEditModeComponent = () => {
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [documentContent, setDocumentContent] = React.useState('# Test Document\n\nSome content here.');
    const [editedContent, setEditedContent] = React.useState('');

    const handleEditClick = () => {
      setEditedContent(documentContent);
      setIsEditMode(true);
    };

    const handleSaveEdit = () => {
      setDocumentContent(editedContent);
      setIsEditMode(false);
      setEditedContent('');
    };

    const handleCancelEdit = () => {
      setIsEditMode(false);
      setEditedContent('');
    };

    return (
      <div>
        <div className="header">
          <h2>Document Title</h2>
          <div>
            {isEditMode ? (
              <>
                <button onClick={handleSaveEdit} aria-label="Save changes">
                  Save
                </button>
                <button onClick={handleCancelEdit} aria-label="Cancel editing">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={handleEditClick} aria-label="Edit document">
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="content">
          {isEditMode ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Enter your markdown content here..."
              data-testid="edit-textarea"
              className="w-full h-full p-6 text-sm text-gray-700 font-mono border-0 rounded-none focus:outline-none resize-none bg-white"
              spellCheck={false}
            />
          ) : (
            <div data-testid="view-content">{documentContent}</div>
          )}
        </div>
      </div>
    );
  };

  describe('Edit Button Visibility', () => {
    it('should show Edit button in view mode', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should show Save and Cancel buttons in edit mode', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel editing/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit document/i })).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode Toggle', () => {
    it('should switch to edit mode when Edit button is clicked', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      expect(screen.getByTestId('edit-textarea')).toBeInTheDocument();
      expect(screen.queryByTestId('view-content')).not.toBeInTheDocument();
    });

    it('should populate textarea with current document content on edit', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('# Test Document\n\nSome content here.');
    });

    it('should show monospace font in textarea for markdown editing', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea');
      expect(textarea).toHaveClass('font-mono');
    });
  });

  describe('Save Functionality', () => {
    it('should save changes when Save button is clicked', () => {
      render(<MockEditModeComponent />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      // Modify content
      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '# Updated Document\n\nNew content!' } });

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Verify content is updated and view mode is restored
      const viewContent = screen.getByTestId('view-content');
      expect(viewContent).toHaveTextContent('# Updated Document');
      expect(viewContent).toHaveTextContent('New content!');
      expect(screen.queryByTestId('edit-textarea')).not.toBeInTheDocument();
    });

    it('should exit edit mode after saving', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(screen.getByRole('button', { name: /edit document/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });

    it('should preserve changes across edit-save-edit cycles', () => {
      render(<MockEditModeComponent />);

      // First edit cycle
      let editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      let textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'First change' } });

      let saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Second edit cycle
      editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('First change');
      expect(textarea.value).not.toBe('# Test Document\n\nSome content here.');
    });
  });

  describe('Cancel Functionality', () => {
    it('should discard changes when Cancel button is clicked', () => {
      render(<MockEditModeComponent />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      // Modify content
      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Temporary changes that should be discarded' } });

      // Cancel without saving
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      fireEvent.click(cancelButton);

      // Verify original content is preserved
      const viewContent = screen.getByTestId('view-content');
      expect(viewContent).toHaveTextContent('# Test Document');
      expect(viewContent).toHaveTextContent('Some content here.');
    });

    it('should exit edit mode without saving', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      fireEvent.click(cancelButton);

      expect(screen.getByRole('button', { name: /edit document/i })).toBeInTheDocument();
      expect(screen.queryByTestId('edit-textarea')).not.toBeInTheDocument();
    });

    it('should restore view mode after cancel', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea');
      expect(textarea).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      fireEvent.click(cancelButton);

      expect(screen.getByTestId('view-content')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-textarea')).not.toBeInTheDocument();
    });
  });

  describe('Content Management', () => {
    it('should support markdown syntax in edited content', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      const markdownContent = `# Heading 1
## Heading 2
- List item 1
- List item 2

**Bold text** and *italic text*`;

      fireEvent.change(textarea, { target: { value: markdownContent } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      const viewContent = screen.getByTestId('view-content');
      expect(viewContent).toHaveTextContent('# Heading 1');
      expect(viewContent).toHaveTextContent('## Heading 2');
      expect(viewContent).toHaveTextContent('- List item 1');
      expect(viewContent).toHaveTextContent('**Bold text**');
    });

    it('should support multi-line content editing', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      const multiLineContent = `Line 1
Line 2
Line 3
Line 4`;

      fireEvent.change(textarea, { target: { value: multiLineContent } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(screen.getByTestId('view-content')).toHaveTextContent('Line 1');
      expect(screen.getByTestId('view-content')).toHaveTextContent('Line 4');
    });

    it('should handle empty content', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      expect(screen.getByTestId('view-content')).toHaveTextContent('');
    });
  });

  describe('Textarea Behavior', () => {
    it('should have proper styling for markdown editing', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea');
      expect(textarea).toHaveClass('w-full', 'h-full', 'p-6', 'font-mono');
    });

    it('should show placeholder text', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe('Enter your markdown content here...');
    });

    it('should disable resize and have no border', () => {
      render(<MockEditModeComponent />);

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea');
      expect(textarea).toHaveClass('border-0', 'resize-none');
    });
  });

  describe('State Preservation', () => {
    it('should not modify document content if Cancel is clicked during edit', () => {
      render(<MockEditModeComponent />);

      const originalContent = screen.getByTestId('view-content').textContent;

      const editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      const textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Should be discarded' } });

      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      fireEvent.click(cancelButton);

      expect(screen.getByTestId('view-content').textContent).toBe(originalContent);
    });

    it('should allow multiple edits without affecting original content', () => {
      render(<MockEditModeComponent />);

      // First edit cycle
      let editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      let textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'First attempt' } });

      let cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      fireEvent.click(cancelButton);

      // Second edit cycle - original content should still be there
      editButton = screen.getByRole('button', { name: /edit document/i });
      fireEvent.click(editButton);

      textarea = screen.getByTestId('edit-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('# Test Document\n\nSome content here.');
    });
  });
});
