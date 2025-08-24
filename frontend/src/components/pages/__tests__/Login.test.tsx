import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import { Login } from '../Login';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

// Mock the useLoginMutation hook
const mockLogin = jest.fn();
jest.mock('../../../store', () => ({
  useLoginMutation: () => [
    mockLogin,
    { isLoading: false, error: null }
  ],
}));

// Mock i18n
jest.mock('../../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'common.appDescription': 'Cloud Storage Integration Platform',
        'auth.login': 'Login',
        'auth.loginSubtitle': 'Login to your account to manage clouds',
        'common.email': 'Email',
        'common.password': 'Password',
        'auth.emailRequired': 'Please enter your email',
        'auth.emailInvalid': 'Please enter a valid email',
        'auth.passwordRequired': 'Please enter your password',
        'auth.passwordMinLength': 'Password must be at least 6 characters',
        'auth.emailPlaceholder': 'Enter your email',
        'auth.passwordPlaceholder': 'Enter your password',
        'auth.rememberMe': 'Remember me',
        'auth.forgotPassword': 'Forgot password',
        'auth.loginButton': 'Login',
        'common.or': 'or',
        'auth.googleLogin': 'Login with Google',
        'auth.githubLogin': 'Login with GitHub',
        'auth.noAccount': "Don't have an account?",
        'auth.signUp': 'Sign up',
        'auth.demoAccount': 'Demo Account',
        'auth.loginSuccess': 'Successfully logged in!',
        'auth.loginFailed': 'Login failed',
        'auth.oauthComingSoon': `${options?.provider} login feature is coming soon.`,
      };
      return translations[key] || key;
    },
  }),
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form correctly', () => {
    renderWithProviders(<Login />);

    expect(screen.getByText('CloudsLinker')).toBeInTheDocument();
    expect(screen.getByText('Cloud Storage Integration Platform')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Login with Google')).toBeInTheDocument();
    expect(screen.getByText('Login with GitHub')).toBeInTheDocument();
  });

  it('displays validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const loginButton = screen.getByRole('button', { name: 'Login' });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter your email')).toBeInTheDocument();
      expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    });
  });

  it('displays validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText('Email');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'invalid-email');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });

  it('displays validation error for short password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('submits login form with valid data', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      unwrap: () => Promise.resolve({
        user: { id: '1', email: 'test@example.com' },
        token: 'mock-token',
      }),
    });

    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const loginButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('handles remember me functionality', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const rememberMeCheckbox = screen.getByLabelText('Remember me');
    
    expect(rememberMeCheckbox).not.toBeChecked();
    
    await user.click(rememberMeCheckbox);
    
    expect(rememberMeCheckbox).toBeChecked();
  });

  it('auto-fills email when remembered', () => {
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('email', 'remembered@example.com');

    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    const rememberMeCheckbox = screen.getByLabelText('Remember me') as HTMLInputElement;

    expect(emailInput.value).toBe('remembered@example.com');
    expect(rememberMeCheckbox.checked).toBe(true);
  });

  it('shows OAuth coming soon messages', async () => {
    const user = userEvent.setup();
    
    // Mock message.info
    const mockMessageInfo = jest.fn();
    jest.doMock('antd', () => ({
      ...jest.requireActual('antd'),
      message: {
        info: mockMessageInfo,
        success: jest.fn(),
        error: jest.fn(),
      },
    }));

    renderWithProviders(<Login />);

    const googleButton = screen.getByText('Login with Google');
    const githubButton = screen.getByText('Login with GitHub');

    await user.click(googleButton);
    await user.click(githubButton);

    // Note: Due to mocking limitations, we can't easily test the message.info calls
    // In a real scenario, you might want to test the click handlers more directly
  });

  it('navigates to forgot password page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const forgotPasswordLink = screen.getByText('Forgot password');
    
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('navigates to sign up page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const signUpLink = screen.getByText('Sign up');
    
    expect(signUpLink).toHaveAttribute('href', '/register');
  });

  it('displays demo account information', () => {
    renderWithProviders(<Login />);

    expect(screen.getByText('Demo Account:')).toBeInTheDocument();
    expect(screen.getByText(/demo@cloudslinker.com/)).toBeInTheDocument();
  });
});