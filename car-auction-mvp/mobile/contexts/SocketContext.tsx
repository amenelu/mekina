import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  unreadMessageCount: number;
  unreadNotificationCount: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  unreadMessageCount: 0,
  unreadNotificationCount: 0,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchCounts = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/unread-counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadMessageCount(response.data.unread_messages);
      setUnreadNotificationCount(response.data.unread_notifications);
    } catch (error) {
      console.error("Failed to fetch unread counts", error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCounts();

      const newSocket = io(API_URL, {
        query: { token },
        transports: ["websocket"],
      });

      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("Socket.IO connected:", newSocket.id);
        setIsConnected(true);
        fetchCounts();
      });

      newSocket.on("disconnect", () => {
        console.log("Socket.IO disconnected");
        setIsConnected(false);
      });

      newSocket.on("message_count_update", (data: { count: number }) => {
        setUnreadMessageCount(data.count);
      });

      newSocket.on("new_notification", (data: { count: number }) => {
        setUnreadNotificationCount(data.count);
      });

      newSocket.on("notification_count_update", (data: { count: number }) => {
        setUnreadNotificationCount(data.count);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadMessageCount,
        unreadNotificationCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
