export const typeDefs = `
  enum BetType {
    NUMBER
    COLOR
    ODD_EVEN
  }

  type User {
    id: ID!
    email: String!
    roles: [String!]!
  }

  type Game {
    id: ID!
    name: String!
    description: String
    minBet: Float!
    maxBet: Float!
    status: String!
  }

  type Wallet {
    id: ID!
    amount: Float!
    currency: String!
  }

  type Transaction {
    id: ID!
    amount: Float!
    type: String!
    reason: String
    createdAt: String!
  }

  type Bet {
    id: ID!
    amount: Float!
    status: String!
    payout: Float!
    netChange: Float!
    betType: BetType!
    betValue: String!
    winningNumber: Int!
    winningColor: String!
    multiplier: Float!
    createdAt: String!
    gameId: ID!
  }

  type LoginResponse {
    accessToken: String!
    user: User!
  }

  type Query {
    me: User
    games: [Game!]!
    game(id: ID!): Game
    walletBalance: Wallet
    transactions(page: Int, size: Int): [Transaction!]!
    betHistory(gameId: ID!, page: Int, size: Int): [Bet!]!
  }

  type Mutation {
    login(email: String!, password: String!): LoginResponse
    logout: Boolean
    placeBet(gameId: ID!, amount: Float!, betType: BetType!, betValue: String!): Bet
    creditWallet(amount: Float!, reason: String!): Wallet
  }
`;
