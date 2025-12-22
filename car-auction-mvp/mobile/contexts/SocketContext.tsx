import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import API_URL from "@/constants/Api";
import { useAuth } from "@/hooks/useAuth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token) {
      const newSocket = io(API_URL, {
        query: { token },
        transports: ["websocket"],
      });

      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("Socket.IO connected:", newSocket.id);
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket.IO disconnected");
        setIsConnected(false);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
