export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  kafkaBroker: process.env.KAFKA_BROKER ?? 'localhost:9092'
};
