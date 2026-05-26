import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { AppState } from "react-native";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";
import { getUnreadCounts } from "@/lib/api/notifications";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  refreshCounts: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  unreadMessageCount: 0,
  unreadNotificationCount: 0,
  refreshCounts: async () => {},
});

function getSocketUrl() {
  const explicitSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (explicitSocketUrl) {
    return explicitSocketUrl;
  }

  return API_URL.replace(/:8083(?=\/|$)/, ":5001");
}

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchCounts = React.useCallback(async () => {
    if (!token) return;
    try {
      const response = await getUnreadCounts();
      setUnreadMessageCount(response.data.unread_messages);
      setUnreadNotificationCount(response.data.unread_notifications);
    } catch (error) {
      console.error("Failed to fetch unread counts", error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      setUnreadMessageCount(0);
      setUnreadNotificationCount(0);
      return;
    }

    fetchCounts();

    const newSocket = io(getSocketUrl(), {
      query: { token },
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      fetchCounts();
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("message_count_update", (data: { count: number }) => {
      setUnreadMessageCount(data.count);
    });

    newSocket.on("new_notification", (data?: { count?: number }) => {
      if (typeof data?.count === "number") {
        setUnreadNotificationCount(data.count);
      } else {
        setUnreadNotificationCount((count) => count + 1);
        fetchCounts();
      }
    });

    newSocket.on("notification_count_update", (data?: { count?: number }) => {
      if (typeof data?.count === "number") {
        setUnreadNotificationCount(data.count);
      } else {
        fetchCounts();
      }
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [fetchCounts, token]);

  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(fetchCounts, 15000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        fetchCounts();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [fetchCounts, token]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadMessageCount,
        unreadNotificationCount,
        refreshCounts: fetchCounts,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
