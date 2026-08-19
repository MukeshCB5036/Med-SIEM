import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

describe('MedSIEM Android Application Smoke Test', () => {
  it('renders login screen initially', () => {
    const { getByText, getByPlaceholderText } = render(<App />);
    expect(getByText('MedSIEM Mobile')).toBeTruthy();
    expect(getByPlaceholderText('Work Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });
});
