import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Plus,
  Settings,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";

interface Device {
  id: string;
  name: string;
  ip: string;
  type: string;
  status: "online" | "offline" | "warning";
  lastSeen: string;
}

interface DevicePanelProps {
  onDeviceSelect?: (device: Device) => void;
  onDeviceConnect?: (device: Device) => Promise<void>;
  onDeviceDisconnect?: (device: Device) => Promise<void>;
}

const DevicePanel = ({
  onDeviceSelect = () => {},
  onDeviceConnect = async () => {},
  onDeviceDisconnect = async () => {},
}: DevicePanelProps) => {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: "1",
      name: "Core-Switch-01",
      ip: "192.168.1.10",
      type: "Switch",
      status: "online",
      lastSeen: "2 min ago",
    },
    {
      id: "2",
      name: "Router-WAN-01",
      ip: "192.168.1.1",
      type: "Router",
      status: "online",
      lastSeen: "1 min ago",
    },
    {
      id: "3",
      name: "Access-Switch-02",
      ip: "192.168.1.20",
      type: "Switch",
      status: "warning",
      lastSeen: "15 min ago",
    },
    {
      id: "4",
      name: "Firewall-01",
      ip: "192.168.1.5",
      type: "Firewall",
      status: "offline",
      lastSeen: "2 hours ago",
    },
  ]);

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    ip: "",
    type: "Router",
  });

  const getStatusIcon = (status: Device["status"]) => {
    switch (status) {
      case "online":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Device["status"]) => {
    const variants = {
      online: "bg-green-100 text-green-800 border-green-200",
      offline: "bg-red-100 text-red-800 border-red-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return (
      <Badge className={`${variants[status]} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device.id);
    onDeviceSelect(device);
  };

  const handleAddDevice = () => {
    if (newDevice.name && newDevice.ip) {
      const device: Device = {
        id: Date.now().toString(),
        name: newDevice.name,
        ip: newDevice.ip,
        type: newDevice.type,
        status: "offline",
        lastSeen: "Never",
      };
      setDevices([...devices, device]);
      setNewDevice({ name: "", ip: "", type: "Router" });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteDevice = (deviceId: string) => {
    setDevices(devices.filter((d) => d.id !== deviceId));
    if (selectedDevice === deviceId) {
      setSelectedDevice(null);
    }
  };

  const handleToggleConnection = async (device: Device) => {
    if (device.status === "online") {
      await onDeviceDisconnect(device);
      setDevices(
        devices.map((d) =>
          d.id === device.id
            ? { ...d, status: "offline" as const, lastSeen: "Just now" }
            : d,
        ),
      );
    } else {
      await onDeviceConnect(device);
      setDevices(
        devices.map((d) =>
          d.id === device.id
            ? { ...d, status: "online" as const, lastSeen: "Just now" }
            : d,
        ),
      );
    }
  };

  return (
    <Card className="w-full h-full bg-background border shadow-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Network Devices</span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Network Device</DialogTitle>
                <DialogDescription>
                  Enter the details for the new network device.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newDevice.name}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, name: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="Device name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ip" className="text-right">
                    IP Address
                  </Label>
                  <Input
                    id="ip"
                    value={newDevice.ip}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, ip: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="192.168.1.1"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={newDevice.type}
                    onValueChange={(value) =>
                      setNewDevice({ ...newDevice, type: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Router">Router</SelectItem>
                      <SelectItem value="Switch">Switch</SelectItem>
                      <SelectItem value="Firewall">Firewall</SelectItem>
                      <SelectItem value="Access Point">Access Point</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddDevice}>Add Device</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {devices.map((device, index) => (
          <div key={device.id}>
            <div
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedDevice === device.id
                  ? "bg-primary/10 border-primary"
                  : "bg-card hover:bg-muted/50"
              }`}
              onClick={() => handleDeviceClick(device)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(device.status)}
                  <span className="font-medium text-sm">{device.name}</span>
                </div>
                {getStatusBadge(device.status)}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>IP: {device.ip}</div>
                <div>Type: {device.type}</div>
                <div>Last seen: {device.lastSeen}</div>
              </div>
              <div className="flex justify-end space-x-1 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleConnection(device);
                  }}
                  className="h-6 px-2"
                >
                  {device.status === "online" ? (
                    <PowerOff className="h-3 w-3" />
                  ) : (
                    <Power className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle settings
                  }}
                  className="h-6 px-2"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDevice(device.id);
                  }}
                  className="h-6 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {index < devices.length - 1 && <Separator className="my-2" />}
          </div>
        ))}
        {devices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No devices configured</p>
            <p className="text-xs">Click "Add Device" to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DevicePanel;
