import { useState, useEffect, useRef } from "react";
import {
  Thermometer,
  Droplet,
  Sprout,
  RefreshCw,
  Power,
  ToggleLeft,
  ToggleRight,
  Wifi,
  WifiOff,
  Microchip,
  Clock,
  Zap,
  GaugeIcon,
  BarChart2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "@/components/sections/gauge";
import { HistoryChart } from "@/components/sections/history-chart";
import { cn } from "@/lib/utils";

// WebSocket API endpoint
const API = "ws://localhost:3000";

// Initial sensor data
const initialSensorData = {
  temperature: 28.5,
  humidity: 65,
  soilMoisture: 5,
  pumpStatus: false,
  autoMode: true,
  lastUpdated: new Date().toISOString(),
  connectionStatus: true,
  espConnected: false,
};

// Sensor calibration
const mapSoilMoisture = (rawValue) => {
  return Math.max(0, Math.min(100, 100 - (rawValue / 1024) * 100));
};

export function DashboardContent() {
  const [sensorData, setSensorData] = useState(initialSensorData);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sensorHistory, setSensorHistory] = useState([]);
  const wsRef = useRef(null);

  const getStatusInfo = (value, type) => {
    switch (type) {
      case "temperature":
        if (value < 18) return { text: "Low", color: "text-[#568F87]" };
        if (value > 35) return { text: "High", color: "text-[#F5BABB]" };
        return { text: "Optimal", color: "text-[#064232]" };
      case "humidity":
        if (value < 30) return { text: "Low", color: "text-[#F5BABB]" };
        if (value > 80) return { text: "High", color: "text-[#568F87]" };
        return { text: "Optimal", color: "text-[#064232]" };
      case "soilMoisture":
        if (value < 30) return { text: "Dry", color: "text-[#F5BABB]" };
        if (value > 50) return { text: "Wet", color: "text-[#568F87]" };
        return { text: "Moist", color: "text-[#064232]" };
      default:
        return { text: "Unknown", color: "text-gray-500" };
    }
  };

  const getGaugeColor = (value, type) => {
    switch (type) {
      case "temperature":
        if (value < 18) return "#568F87";
        if (value > 30) return "#F5BABB";
        return "#064232";
      case "humidity":
        if (value < 30) return "#F5BABB";
        if (value > 80) return "#568F87";
        return "#064232";
      case "soilMoisture":
        if (value < 30) return "#F5BABB";
        if (value > 50) return "#568F87";
        return "#064232";
      default:
        return "#568F87";
    }
  };

  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket(API);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        socket.send(
          JSON.stringify({ type: "init-frontend", frontendId: "frontend-1234" })
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          setSensorHistory((prev) =>
            [...prev, { ...data, timestamp: new Date().toISOString() }].slice(
              -100
            )
          );

          setSensorData((prev) => ({
            ...prev,
            temperature: data.temperature ?? prev.temperature,
            humidity: data.humidity ?? prev.humidity,
            soilMoisture: data.soilMoisture ?? prev.soilMoisture,
            pumpStatus: data.pumpStatus ?? prev.pumpStatus,
            autoMode: data.autoMode ?? prev.autoMode,
            lastUpdated: new Date().toISOString(),
            espConnected: data.espConnected ?? prev.espConnected,
          }));
        } catch (error) {
          console.warn("Ignored non-JSON message:", event.data);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = () => setIsConnected(false);
    };

    connectWebSocket();
    return () => wsRef.current?.close();
  }, []);

  const togglePump = () => {
    const newStatus = !sensorData.pumpStatus;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "command",
          command: "pump",
          value: newStatus ? "on" : "off",
        })
      );
    }
    setSensorData((prev) => ({ ...prev, pumpStatus: newStatus }));
  };

  const toggleAutoMode = () => {
    const newMode = !sensorData.autoMode;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "command",
          command: "autoMode",
          value: newMode ? "on" : "off",
        })
      );
    }
    setSensorData((prev) => ({ ...prev, autoMode: newMode }));
  };

  const refreshData = () => {
    setIsLoading(true);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "refresh" }));
    }
    setTimeout(() => setIsLoading(false), 2000);
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString();
  const mappedSoilMoisture = mapSoilMoisture(sensorData.soilMoisture);

  return (
    <div className="space-y-6 bg-[#FFF5F2] min-h-screen p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#064232]">
            Smart Irrigation System
          </h1>
          <p className="text-[#568F87]">
            Real-time monitoring and control for optimal plant growth
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            className={`flex items-center gap-1 ${
              isConnected
                ? "bg-[#568F87] text-white"
                : "bg-[#F5BABB] text-[#064232]"
            }`}
          >
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge
            className={`flex items-center gap-1 ${
              sensorData.espConnected
                ? "bg-[#568F87] text-white"
                : "bg-[#F5BABB] text-[#064232]"
            }`}
          >
            <Microchip className="h-3 w-3" />
            {sensorData.espConnected ? "ESP Online" : "ESP Offline"}
          </Badge>
          <div className="text-sm text-[#064232] flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(sensorData.lastUpdated)}
          </div>
          <Button
            onClick={refreshData}
            disabled={isLoading}
            className="bg-[#064232] text-white hover:bg-[#568F87]"
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dashboard Grid with Circular Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Temperature */}
        <Card className="shadow-lg border-none rounded-full w-64 h-64 flex flex-col items-center justify-center mx-auto bg-gradient-to-br from-[#F5BABB] to-[#568F87] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              <Thermometer className="h-6 w-6" /> Temperature
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-4xl font-bold">{sensorData.temperature}°C</div>
          </CardContent>
        </Card>

        {/* Humidity */}
        <Card className="shadow-lg border-none rounded-full w-64 h-64 flex flex-col items-center justify-center mx-auto bg-gradient-to-br from-[#568F87] to-[#064232] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              <Droplet className="h-6 w-6" /> Humidity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-4xl font-bold">
              {sensorData.humidity.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {/* Soil Moisture */}
        <Card className="shadow-lg border-none rounded-full w-64 h-64 flex flex-col items-center justify-center mx-auto bg-gradient-to-br from-[#064232] to-[#F5BABB] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              <Sprout className="h-6 w-6" /> Soil Moisture
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-4xl font-bold">
              {mappedSoilMoisture.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="shadow-lg border-none bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#064232]">
            <Clock className="h-5 w-5" /> Data History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="24h">
            <TabsList className="bg-[#F5BABB]/40">
              <TabsTrigger value="24h">24 Hours</TabsTrigger>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
            </TabsList>
            <TabsContent value="24h" className="h-[300px]">
              <HistoryChart type="24h" />
            </TabsContent>
            <TabsContent value="7d" className="h-[300px]">
              <HistoryChart type="7d" />
            </TabsContent>
            <TabsContent value="30d" className="h-[300px]">
              <HistoryChart type="30d" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card className="shadow-lg border-none bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#064232]">
            <BarChart2 className="h-5 w-5" /> Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5BABB]/20">
            <div className="flex items-center gap-3">
              <Power className="h-5 w-5 text-[#064232]" />
              <div>
                <div className="font-medium">Pump Status</div>
                <div className="text-sm">
                  {sensorData.pumpStatus ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
            <Switch
              checked={sensorData.pumpStatus}
              onCheckedChange={togglePump}
              disabled={sensorData.autoMode}
              className="data-[state=checked]:bg-[#064232]"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5BABB]/20">
            <div className="flex items-center gap-3">
              {sensorData.autoMode ? (
                <ToggleRight className="h-5 w-5 text-[#568F87]" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-[#F5BABB]" />
              )}
              <div>
                <div className="font-medium">Auto Mode</div>
                <div className="text-sm">
                  {sensorData.autoMode ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
            <Switch
              checked={sensorData.autoMode}
              onCheckedChange={toggleAutoMode}
              className="data-[state=checked]:bg-[#568F87]"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="shadow-lg border-none bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#064232]">
            <Zap className="h-5 w-5" /> System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className={`flex items-center gap-3 p-3 rounded-lg ${
                isConnected ? "bg-[#568F87]/20" : "bg-[#F5BABB]/20"
              }`}
            >
              {isConnected ? (
                <Wifi className="h-5 w-5 text-[#064232]" />
              ) : (
                <WifiOff className="h-5 w-5 text-[#F5BABB]" />
              )}
              <div>
                <div className="font-medium">WebSocket</div>
                <div className="text-sm">
                  {isConnected ? "Connected" : "Disconnected"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#568F87]/20">
              <Thermometer className="h-5 w-5 text-[#064232]" />
              <div>
                <div className="font-medium">DHT11 Sensor</div>
                <div className="text-sm">Online</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#568F87]/20">
              <Sprout className="h-5 w-5 text-[#064232]" />
              <div>
                <div className="font-medium">Soil Sensor</div>
                <div className="text-sm">Online</div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-[#568F87] border-t pt-4">
          <Clock className="h-4 w-4" /> Last check:{" "}
          {formatDate(sensorData.lastUpdated)}
        </CardFooter>
      </Card>
    </div>
  );
}
