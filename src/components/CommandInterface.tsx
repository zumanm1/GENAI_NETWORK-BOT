import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, X, Send, Loader2 } from "lucide-react";

interface CommandInterfaceProps {
  onSubmit?: (command: string, provider: string) => Promise<void>;
  onApprove?: (config: string) => Promise<void>;
  onReject?: () => void;
}

const CommandInterface = ({
  onSubmit = async () => {},
  onApprove = async () => {},
  onReject = () => {},
}: CommandInterfaceProps) => {
  const [command, setCommand] = useState<string>("");
  const [provider, setProvider] = useState<string>("groq");
  const [generatedConfig, setGeneratedConfig] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("input");

  const handleSubmit = async () => {
    if (!command.trim()) return;

    setIsLoading(true);
    try {
      await onSubmit(command, provider);
      // For demo purposes, simulate a response
      setTimeout(() => {
        setGeneratedConfig(
          `! Generated Cisco IOS Configuration\n\ninterface GigabitEthernet0/1\n description WAN Connection\n ip address 192.168.1.1 255.255.255.0\n no shutdown\n!\nrouter ospf 1\n network 192.168.1.0 0.0.0.255 area 0\n!\nip route 0.0.0.0 0.0.0.0 192.168.1.254\n!`,
        );
        setActiveTab("output");
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Error generating configuration:", error);
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove(generatedConfig);
      // Simulate success
      setTimeout(() => {
        setIsLoading(false);
        setCommand("");
        setGeneratedConfig("");
        setActiveTab("input");
      }, 1000);
    } catch (error) {
      console.error("Error applying configuration:", error);
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    setGeneratedConfig("");
    setActiveTab("input");
    onReject();
  };

  return (
    <Card className="w-full h-full bg-background border shadow-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Command Interface</span>
          <div className="flex items-center space-x-2">
            <Label
              htmlFor="provider-toggle"
              className={`text-sm ${provider === "ollama" ? "text-muted-foreground" : ""}`}
            >
              Groq
            </Label>
            <Switch
              id="provider-toggle"
              checked={provider === "ollama"}
              onCheckedChange={(checked) =>
                setProvider(checked ? "ollama" : "groq")
              }
            />
            <Label
              htmlFor="provider-toggle"
              className={`text-sm ${provider === "groq" ? "text-muted-foreground" : ""}`}
            >
              Ollama
            </Label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input">Command Input</TabsTrigger>
            <TabsTrigger value="output" disabled={!generatedConfig}>
              Configuration Output
            </TabsTrigger>
          </TabsList>
          <TabsContent value="input" className="mt-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your network command in natural language..."
                className="min-h-[300px] font-mono"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={!command.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Generate Configuration
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="output" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {generatedConfig}
                </pre>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apply Configuration</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to apply this configuration to the
                        selected network device(s)? This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleApprove}>
                        Apply Configuration
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>
          Using {provider === "groq" ? "Groq API" : "Ollama"} for LLM processing
        </p>
      </CardFooter>
    </Card>
  );
};

export default CommandInterface;
