import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '../../app/providers/AuthProvider';
import { LoginPage } from './index';

const mockNavigate = jest.fn();
const mockLocation: { state: { from?: string } | null } = { state: null };

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

jest.mock('../../app/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.state = null;
  });

  it('redirects immediately when user is already logged in', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@casino.dev', roles: ['ADMIN'] },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/roulette', { replace: true });
    });
  });

  it('uses previous route from location state for redirect', async () => {
    mockLocation.state = { from: '/funds' };
    mockedUseAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@casino.dev', roles: ['ADMIN'] },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/funds', { replace: true });
    });
  });

  it('shows backend error when login fails', async () => {
    const loginMock = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: loginMock,
      logout: jest.fn(),
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in and Play' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('/roulette', { replace: true });
  });

  it('submits credentials and navigates on successful login', async () => {
    const loginMock = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: loginMock,
      logout: jest.fn(),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@casino.dev' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in and Play' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('player@casino.dev', 'password');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/roulette', { replace: true });
  });
});
