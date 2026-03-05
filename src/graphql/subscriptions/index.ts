import { gql } from '@apollo/client';

export const WALLET_UPDATED_SUB = gql`subscription WalletUpdated($userId: ID!) { walletUpdated(userId: $userId) { userId amount currency } }`;
export const BET_RESOLVED_SUB = gql`subscription BetResolved($betId: ID!) { betResolved(betId: $betId) { id status payout amount gameId } }`;
export const NOTIFICATION_RECEIVED_SUB = gql`subscription NotificationReceived($userId: ID!) { notificationReceived(userId: $userId) { id message createdAt } }`;
