import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Network, Bot, Settings } from "lucide-react";
import CommandInterface from "./CommandInterface";
import DevicePanel from "./DevicePanel";
import ApiKeyManager from "./ApiKeyManager";

function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleCommandSubmit = async (command: string, provider: string) => {
    console.log("Command submitted:", { command, provider, selectedDevice });
    // Here you would integrate with your Python backend
  };

  const handleConfigApprove = async (config: string) => {
    console.log("Configuration approved:", { config, selectedDevice });
    // Here you would apply the configuration to the selected device
  };

  const handleDeviceSelect = (device: any) => {
    setSelectedDevice(device);
    console.log("Device selected:", device);
  };

  const handleDeviceConnect = async (device: any) => {
    console.log("Connecting to device:", device);
    // Here you would establish connection to the device
  };

  const handleDeviceDisconnect = async (device: any) => {
    console.log("Disconnecting from device:", device);
    // Here you would disconnect from the device
  };

  const handleApiKeyUpdate = (keys: any[]) => {
    console.log("API keys updated:", keys);
    // Here you would sync the keys with your backend
  };

  return (
    <div
      className={`w-screen h-screen bg-background ${isDarkMode ? "dark" : ""}`}
    >
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Network className="h-6 w-6 text-primary" />
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Network Whisperer</h1>
              <p className="text-sm text-muted-foreground">
                Natural Language Network Operations
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {selectedDevice && (
              <div className="text-sm text-muted-foreground">
                Selected:{" "}
                <span className="font-medium">{selectedDevice.name}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-4rem)]">
        {/* Left Panel - Device Management */}
        <div className="w-80 border-r bg-card/30">
          <div className="h-full p-4">
            <DevicePanel
              onDeviceSelect={handleDeviceSelect}
              onDeviceConnect={handleDeviceConnect}
              onDeviceDisconnect={handleDeviceDisconnect}
            />
          </div>
        </div>

        {/* Center Panel - Command Interface */}
        <div className="flex-1 bg-background">
          <div className="h-full p-4">
            <CommandInterface
              onSubmit={handleCommandSubmit}
              onApprove={handleConfigApprove}
              onReject={() => console.log("Configuration rejected")}
            />
          </div>
        </div>

        {/* Right Panel - API Key Management */}
        <div className="w-96 border-l bg-card/30">
          <div className="h-full p-4">
            <ApiKeyManager
              onKeySelect={(key) => console.log("Key selected:", key)}
              onKeyUpdate={handleApiKeyUpdate}
            />
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-8 items-center justify-between px-6 text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Status: Ready</span>
            <span>•</span>
            <span>Backend: Python</span>
            <span>•</span>
            <span>Frontend: Vite + React</span>
          </div>
          <div className="flex items-center space-x-2">
            <Settings className="h-3 w-3" />
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
