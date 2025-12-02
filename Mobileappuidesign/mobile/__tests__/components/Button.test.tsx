// TODO: installer @testing-library/react-native pour activer ces tests
/*
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/src/components/ui/Button';

// Mock de ActivityIndicator pour éviter les erreurs de rendu
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    ActivityIndicator: () => 'ActivityIndicator',
  };
});

describe('Button', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<Button title="Test Button" onPress={() => {}} />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<Button title="Test Button" onPress={mockOnPress} />);
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} disabled />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator', () => {
    const { queryByText } = render(
      <Button title="Test Button" onPress={() => {}} loading />
    );
    
    expect(queryByText('Test Button')).toBeFalsy();
  });
});
*/
