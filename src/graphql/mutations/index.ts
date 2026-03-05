import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) { accessToken user { id email roles } }
  }
`;
export const LOGOUT_MUTATION = gql`mutation Logout { logout }`;
export const PLACE_BET_MUTATION = gql`
  mutation PlaceBet($gameId: ID!, $amount: Float!) {
    placeBet(gameId: $gameId, amount: $amount) { id amount status payout createdAt gameId }
  }
`;
export const CREDIT_WALLET_MUTATION = gql`
  mutation CreditWallet($amount: Float!, $reason: String!) {
    creditWallet(amount: $amount, reason: $reason) { id amount currency }
  }
`;
