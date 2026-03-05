import { gql } from '@apollo/client';

export const ME_QUERY = gql`query Me { me { id email roles } }`;
export const GAMES_QUERY = gql`query Games { games { id name minBet maxBet status } }`;
export const GAME_QUERY = gql`
  query Game($gameId: ID!) {
    game(id: $gameId) { id name description minBet maxBet status }
  }
`;
export const WALLET_BALANCE_QUERY = gql`query WalletBalance { walletBalance { id amount currency } }`;
export const TRANSACTIONS_QUERY = gql`
  query Transactions($page: Int!, $size: Int!) {
    transactions(page: $page, size: $size) { id amount type reason createdAt }
  }
`;
export const BET_HISTORY_QUERY = gql`
  query BetHistory($gameId: ID!, $page: Int!, $size: Int!) {
    betHistory(gameId: $gameId, page: $page, size: $size) { id amount status payout createdAt }
  }
`;
