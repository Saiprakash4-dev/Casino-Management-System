import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      user {
        id
        email
        roles
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const PLACE_BET_MUTATION = gql`
  mutation PlaceBet($gameId: ID!, $amount: Float!, $betType: BetType!, $betValue: String!) {
    placeBet(gameId: $gameId, amount: $amount, betType: $betType, betValue: $betValue) {
      id
      roundId
      amount
      status
      payout
      netChange
      betType
      betValue
      winningNumber
      winningColor
      multiplier
      createdAt
      resolvedAt
      gameId
    }
  }
`;

export const CREDIT_WALLET_MUTATION = gql`
  mutation CreditWallet($amount: Float!, $reason: String!) {
    creditWallet(amount: $amount, reason: $reason) {
      id
      amount
      currency
    }
  }
`;
