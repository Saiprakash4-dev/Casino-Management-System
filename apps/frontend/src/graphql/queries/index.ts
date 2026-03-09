import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      roles
    }
  }
`;

export const GAMES_QUERY = gql`
  query Games {
    games {
      id
      name
      description
      minBet
      maxBet
      status
    }
  }
`;

export const GAME_QUERY = gql`
  query Game($id: ID!) {
    game(id: $id) {
      id
      name
      description
      minBet
      maxBet
      status
    }
  }
`;

export const WALLET_BALANCE_QUERY = gql`
  query WalletBalance {
    walletBalance {
      id
      amount
      currency
    }
  }
`;

export const TRANSACTIONS_QUERY = gql`
  query Transactions($page: Int, $size: Int) {
    transactions(page: $page, size: $size) {
      id
      amount
      type
      reason
      createdAt
    }
  }
`;

export const BET_HISTORY_QUERY = gql`
  query BetHistory($gameId: ID!, $page: Int, $size: Int) {
    betHistory(gameId: $gameId, page: $page, size: $size) {
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
    }
  }
`;

export const ACTIVE_GAME_ROUND_QUERY = gql`
  query ActiveGameRound($gameId: ID!) {
    activeGameRound(gameId: $gameId) {
      id
      gameId
      status
      startsAt
      endsAt
      timeRemainingSec
      totalBets
      pot
    }
  }
`;

export const RECENT_GAME_RESULTS_QUERY = gql`
  query RecentGameResults($gameId: ID!, $limit: Int) {
    recentGameResults(gameId: $gameId, limit: $limit) {
      roundId
      gameId
      winningNumber
      winningColor
      resolvedAt
      totalBets
      totalWagered
      totalPayout
    }
  }
`;

export const ROULETTE_SNAPSHOT_QUERY = gql`
  query RouletteSnapshot($gameId: ID!) {
    rouletteSnapshot(gameId: $gameId) {
      activeRound {
        id
        gameId
        status
        startsAt
        endsAt
        timeRemainingSec
        totalBets
        pot
      }
      recentResults {
        roundId
        gameId
        winningNumber
        winningColor
        resolvedAt
        totalBets
        totalWagered
        totalPayout
      }
      myBets {
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
      }
      wallet {
        id
        amount
        currency
      }
    }
  }
`;
