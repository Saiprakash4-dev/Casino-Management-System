export type RealtimeMessage =
  | {
      type: 'snapshot';
      payload: {
        activeRound: any | null;
        recentResults: any[];
        myBets: any[];
        wallet: { id: string; amount: number; currency: string };
      };
    }
  | { type: 'round:update'; payload: any | null }
  | { type: 'round:result'; payload: any }
  | { type: 'bet:update'; payload: any }
  | { type: 'wallet:update'; payload: { id: string; amount: number; currency: string } }
  | { type: 'session:expired'; payload: { reason: string } }
  | { type: 'pong' };

type RealtimeOptions = {
  token: string;
  onMessage: (message: RealtimeMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

const resolveRealtimeUrl = (token: string) => {
  const configured = import.meta.env.VITE_REALTIME_URL;
  if (configured) {
    const direct = new URL(configured, window.location.origin);
    direct.searchParams.set('token', token);
    return direct.toString();
  }

  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql';
  const realtimeUrl = new URL(graphqlUrl);
  realtimeUrl.protocol = realtimeUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  realtimeUrl.pathname = '/realtime';
  realtimeUrl.search = '';
  realtimeUrl.searchParams.set('token', token);
  return realtimeUrl.toString();
};

export const connectRealtime = ({ token, onMessage, onOpen, onClose }: RealtimeOptions) => {
  const socketUrl = resolveRealtimeUrl(token);
  let disposed = false;
  let reconnectAttempt = 0;
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;

  const scheduleReconnect = () => {
    if (disposed) return;
    const delay = Math.min(6000, 800 * 2 ** reconnectAttempt);
    reconnectAttempt += 1;
    reconnectTimer = window.setTimeout(connect, delay);
  };

  const connect = () => {
    if (disposed) return;

    socket = new WebSocket(socketUrl);
    socket.onopen = () => {
      reconnectAttempt = 0;
      onOpen?.();
    };

    socket.onmessage = (event) => {
      let message: RealtimeMessage;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      onMessage(message);
    };

    socket.onclose = () => {
      onClose?.();
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'Client shutdown');
    } else if (socket) {
      socket.close();
    }
  };
};
