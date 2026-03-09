import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';

jest.mock('../../app/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const renderProtectedRoute = () =>
  render(
    <MemoryRouter
      initialEntries={['/roulette']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/roulette"
          element={
            <ProtectedRoute>
              <p>Secret Roulette</p>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<p>Login Screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loader while auth status is loading', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProtectedRoute>
          <p>Secret Roulette</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Secret Roulette')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderProtectedRoute();

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret Roulette')).not.toBeInTheDocument();
  });

  it('renders protected content for authenticated users', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'player@casino.dev', roles: ['USER'] },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    renderProtectedRoute();

    expect(screen.getByText('Secret Roulette')).toBeInTheDocument();
    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument();
  });
});
