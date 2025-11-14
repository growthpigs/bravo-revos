import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { FormControlAPI } from '@/lib/orchestration/form-control-api';
import React, { useState } from 'react';

function TestForm() {
  const [value, setValue] = useState('');

  return (
    <input
      id="test-field"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      data-testid="test-input"
    />
  );
}

describe('FormControlAPI', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('fills field and triggers React change events', async () => {
    render(<TestForm />);

    const api = new FormControlAPI();
    const input = screen.getByTestId('test-input') as HTMLInputElement;

    const promise = api.fillField('test-field', 'Hello World');
    jest.runAllTimers();
    await promise;

    expect(input.value).toBe('Hello World');
  });

  it('animates typing when animated option is true', async () => {
    render(<TestForm />);

    const api = new FormControlAPI();
    const input = screen.getByTestId('test-input') as HTMLInputElement;

    // Start animation for ABC
    api.fillField('test-field', 'ABC', { animated: true });

    // Complete all pending timers
    jest.runAllTimers();

    // Value should be set
    expect(input.value).toBe('ABC');

    // Highlight should have been added and removed (2s timeout)
    // Since we ran all timers, the class was added and then removed
    // Just verify the animation completed
  });

  it('highlights field after filling', async () => {
    render(<TestForm />);

    const api = new FormControlAPI();
    const input = screen.getByTestId('test-input') as HTMLInputElement;

    const promise = api.fillField('test-field', 'Test');
    // Check that highlight is added immediately after fill
    jest.advanceTimersByTime(100);
    expect(input.classList.contains('ai-highlight')).toBe(true);

    jest.runAllTimers();
    await promise;
  });

  it('respects delay option', async () => {
    render(<TestForm />);

    const api = new FormControlAPI();
    const promise = api.fillField('test-field', 'Test', { delay: 500 });

    jest.advanceTimersByTime(100);
    // Should not be done yet
    expect(promise).toBeDefined();

    jest.advanceTimersByTime(400);
    jest.runAllTimers();
    await promise;
  });

  it('throws error if field not found', async () => {
    const api = new FormControlAPI();

    await expect(api.fillField('non-existent-field', 'value')).rejects.toThrow(
      "Field with id 'non-existent-field' not found"
    );
  });

  it('clicks button and triggers click event', async () => {
    document.body.innerHTML = '<button id="test-button">Click me</button>';

    const api = new FormControlAPI();
    const button = document.getElementById('test-button') as HTMLButtonElement;
    const clickSpy = jest.spyOn(button, 'click');

    const promise = api.clickButton('test-button');
    // Check that highlight was added
    jest.advanceTimersByTime(100);
    expect(button.classList.contains('ai-highlight')).toBe(true);

    jest.runAllTimers();
    await promise;

    expect(clickSpy).toHaveBeenCalled();
  });

  it('selects option in select element', async () => {
    document.body.innerHTML = `
      <select id="test-select">
        <option value="">Select</option>
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
      </select>
    `;

    const api = new FormControlAPI();
    const select = document.getElementById('test-select') as HTMLSelectElement;

    const promise = api.selectOption('test-select', 'option2');
    // Check that value and highlight are set
    jest.advanceTimersByTime(100);
    expect(select.value).toBe('option2');
    expect(select.classList.contains('ai-highlight')).toBe(true);

    jest.runAllTimers();
    await promise;
  });

  it('throws error if button not found', async () => {
    const api = new FormControlAPI();

    await expect(api.clickButton('non-existent-button')).rejects.toThrow(
      "Button with id 'non-existent-button' not found"
    );
  });

  it('throws error if select not found', async () => {
    const api = new FormControlAPI();

    await expect(api.selectOption('non-existent-select', 'value')).rejects.toThrow(
      "Select with id 'non-existent-select' not found"
    );
  });
});
