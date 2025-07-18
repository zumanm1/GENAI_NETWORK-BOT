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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  X,
  Send,
  Loader2,
  Upload,
  Download,
  Router,
  CheckCircle,
} from "lucide-react";

interface CommandInterfaceProps {
  onSubmit?: (command: string, provider: string) => Promise<void>;
  onApprove?: (config: string) => Promise<void>;
  onReject?: () => void;
  onPushToDummy?: (config: string) => Promise<void>;
  onRetrieveFromDummy?: () => Promise<void>;
  selectedDeviceId?: string;
}

const CommandInterface = ({
  onSubmit = async () => {},
  onApprove = async () => {},
  onReject = () => {},
  onPushToDummy = async () => {},
  onRetrieveFromDummy = async () => {},
  selectedDeviceId = "",
}: CommandInterfaceProps) => {
  const [command, setCommand] = useState<string>("");
  const [provider, setProvider] = useState<string>("groq");
  const [generatedConfig, setGeneratedConfig] = useState<string>("");
  const [retrievedConfig, setRetrievedConfig] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isRetrieving, setIsRetrieving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("input");
  const [pushSteps, setPushSteps] = useState<Array<any>>([]);
  const [pushProgress, setPushProgress] = useState<number>(0);

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

  const handlePushToDummy = async () => {
    if (!generatedConfig.trim() || !selectedDeviceId) return;

    setIsPushing(true);
    setPushSteps([]);
    setPushProgress(0);

    try {
      // Simulate push steps visualization
      const steps = [
        {
          step: 1,
          action: "Connecting to dummy router",
          status: "in-progress",
        },
        { step: 2, action: "Entering configuration mode", status: "pending" },
        { step: 3, action: "Applying configuration", status: "pending" },
        { step: 4, action: "Saving configuration", status: "pending" },
        { step: 5, action: "Verifying configuration", status: "pending" },
      ];

      setPushSteps([...steps]);

      // Simulate step-by-step progress
      for (let i = 0; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        steps[i].status = "completed";
        if (i < steps.length - 1) {
          steps[i + 1].status = "in-progress";
        }
        setPushSteps([...steps]);
        setPushProgress(((i + 1) / steps.length) * 100);
      }

      await onPushToDummy(generatedConfig);
      setActiveTab("push-status");
    } catch (error) {
      console.error("Error pushing to dummy router:", error);
    } finally {
      setIsPushing(false);
    }
  };

  const handleRetrieveFromDummy = async () => {
    if (!selectedDeviceId) return;

    setIsRetrieving(true);
    try {
      await onRetrieveFromDummy();
      // Simulate retrieved config
      setTimeout(() => {
        setRetrievedConfig(
          `! Retrieved Configuration from Dummy Router\n! Device: ${selectedDeviceId}\n!\nhostname DummyRouter\n!\ninterface GigabitEthernet0/1\n description Retrieved Interface\n ip address 192.168.100.1 255.255.255.0\n no shutdown\n!\nrouter ospf 1\n network 192.168.100.0 0.0.0.255 area 0\n!\nend`,
        );
        setActiveTab("retrieved");
        setIsRetrieving(false);
      }, 1500);
    } catch (error) {
      console.error("Error retrieving from dummy router:", error);
      setIsRetrieving(false);
    }
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="input">Command Input</TabsTrigger>
            <TabsTrigger value="output" disabled={!generatedConfig}>
              Generated Config
            </TabsTrigger>
            <TabsTrigger value="push-status" disabled={!generatedConfig}>
              Push Status
            </TabsTrigger>
            <TabsTrigger value="retrieved" disabled={!retrievedConfig}>
              Retrieved Config
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
                <Button
                  variant="outline"
                  onClick={handlePushToDummy}
                  disabled={isLoading || isPushing || !selectedDeviceId}
                >
                  {isPushing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Push to Dummy
                    </>
                  )}
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
          <TabsContent value="push-status" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Router className="mr-2 h-5 w-5" />
                  Dummy Router Push Status
                </h3>
                <Badge variant={isPushing ? "secondary" : "default"}>
                  {isPushing ? "In Progress" : "Completed"}
                </Badge>
              </div>

              {pushSteps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Progress:</span>
                    <Progress value={pushProgress} className="flex-1" />
                    <span className="text-sm text-muted-foreground">
                      {Math.round(pushProgress)}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    {pushSteps.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex-shrink-0">
                          {step.status === "completed" && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {step.status === "in-progress" && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          )}
                          {step.status === "pending" && (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                        <span className="text-sm">{step.action}</span>
                        <Badge
                          variant={
                            step.status === "completed"
                              ? "default"
                              : step.status === "in-progress"
                                ? "secondary"
                                : "outline"
                          }
                          className="ml-auto"
                        >
                          {step.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleRetrieveFromDummy}
                  disabled={isRetrieving || !selectedDeviceId}
                >
                  {isRetrieving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Retrieving...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Retrieve Config
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="retrieved" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Download className="mr-2 h-5 w-5" />
                  Retrieved Configuration
                </h3>
                <Badge variant="default">From Dummy Router</Badge>
              </div>

              <div className="p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {retrievedConfig}
                </pre>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedConfig(retrievedConfig);
                    setActiveTab("output");
                  }}
                >
                  Use as Template
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetrieveFromDummy}
                  disabled={isRetrieving}
                >
                  {isRetrieving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground flex justify-between">
        <p>
          Using {provider === "groq" ? "Groq API" : "Ollama"} for LLM processing
        </p>
        {selectedDeviceId && (
          <p className="flex items-center">
            <Router className="mr-1 h-3 w-3" />
            Dummy Router: {selectedDeviceId}
          </p>
        )}
      </CardFooter>
    </Card>
  );
};

export default CommandInterface;
