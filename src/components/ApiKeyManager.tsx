import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Key,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Shield,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  key: string;
  model?: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

interface ApiKeyManagerProps {
  onKeySelect?: (key: ApiKey) => void;
  onKeyUpdate?: (keys: ApiKey[]) => void;
}

const ApiKeyManager = ({
  onKeySelect = () => {},
  onKeyUpdate = () => {},
}: ApiKeyManagerProps) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [newKey, setNewKey] = useState({
    name: "",
    provider: "groq",
    key: "",
    model: "",
  });

  // Load keys from localStorage on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem("ai-network-whisperer-api-keys");
    if (savedKeys) {
      try {
        const keys = JSON.parse(savedKeys);
        setApiKeys(keys);
      } catch (error) {
        console.error("Error loading API keys:", error);
      }
    } else {
      // Add some demo keys
      const demoKeys: ApiKey[] = [
        {
          id: "1",
          name: "Groq Production",
          provider: "groq",
          key: "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          model: "llama3-8b-8192",
          isActive: true,
          createdAt: "2024-01-15",
          lastUsed: "2 hours ago",
        },
        {
          id: "2",
          name: "Ollama Local",
          provider: "ollama",
          key: "http://localhost:11434",
          model: "llama2",
          isActive: false,
          createdAt: "2024-01-10",
          lastUsed: "1 day ago",
        },
      ];
      setApiKeys(demoKeys);
      localStorage.setItem(
        "ai-network-whisperer-api-keys",
        JSON.stringify(demoKeys),
      );
    }
  }, []);

  // Save keys to localStorage whenever they change
  useEffect(() => {
    if (apiKeys.length > 0) {
      localStorage.setItem(
        "ai-network-whisperer-api-keys",
        JSON.stringify(apiKeys),
      );
      onKeyUpdate(apiKeys);
    }
  }, [apiKeys, onKeyUpdate]);

  const handleAddKey = () => {
    if (newKey.name && newKey.key) {
      const key: ApiKey = {
        id: Date.now().toString(),
        name: newKey.name,
        provider: newKey.provider,
        key: newKey.key,
        model: newKey.model || getDefaultModel(newKey.provider),
        isActive: apiKeys.length === 0, // First key is active by default
        createdAt: new Date().toISOString().split("T")[0],
      };
      setApiKeys([...apiKeys, key]);
      setNewKey({ name: "", provider: "groq", key: "", model: "" });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditKey = () => {
    if (editingKey && editingKey.name && editingKey.key) {
      setApiKeys(
        apiKeys.map((k) => (k.id === editingKey.id ? { ...editingKey } : k)),
      );
      setEditingKey(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteKey = (keyId: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== keyId));
  };

  const handleToggleActive = (keyId: string) => {
    setApiKeys(
      apiKeys.map((k) => ({
        ...k,
        isActive: k.id === keyId ? !k.isActive : k.isActive,
      })),
    );
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "*".repeat(key.length);
    return key.substring(0, 4) + "*".repeat(key.length - 8) + key.slice(-4);
  };

  const getDefaultModel = (provider: string): string => {
    const defaultModels: Record<string, string> = {
      groq: "llama3-8b-8192",
      openai: "gpt-3.5-turbo",
      claude: "claude-3-haiku-20240307",
      ollama: "llama2",
    };
    return defaultModels[provider] || "";
  };

  const getAvailableModels = (provider: string): string[] => {
    const models: Record<string, string[]> = {
      groq: [
        "llama3-8b-8192",
        "llama3-70b-8192",
        "mixtral-8x7b-32768",
        "gemma-7b-it",
        "gemma2-9b-it",
      ],
      openai: [
        "gpt-3.5-turbo",
        "gpt-4",
        "gpt-4-turbo",
        "gpt-4o",
        "gpt-4o-mini",
      ],
      claude: [
        "claude-3-haiku-20240307",
        "claude-3-sonnet-20240229",
        "claude-3-opus-20240229",
      ],
      ollama: [
        "llama2",
        "llama3",
        "codellama",
        "mistral",
        "mixtral",
        "neural-chat",
        "starling-lm",
        "dolphin-mixtral",
      ],
    };
    return models[provider] || [];
  };

  const getProviderBadge = (provider: string) => {
    const colors = {
      groq: "bg-purple-100 text-purple-800 border-purple-200",
      ollama: "bg-blue-100 text-blue-800 border-blue-200",
      openai: "bg-green-100 text-green-800 border-green-200",
      claude: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return (
      <Badge
        className={`${colors[provider as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"} border`}
      >
        {provider.charAt(0).toUpperCase() + provider.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="w-full h-full bg-background border shadow-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>API Key Manager</span>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add API Key</DialogTitle>
                <DialogDescription>
                  Add a new API key for LLM provider integration.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="key-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="key-name"
                    value={newKey.name}
                    onChange={(e) =>
                      setNewKey({ ...newKey, name: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="My Groq Key"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="provider" className="text-right">
                    Provider
                  </Label>
                  <Select
                    value={newKey.provider}
                    onValueChange={(value) =>
                      setNewKey({ ...newKey, provider: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="groq">Groq</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="api-key" className="text-right">
                    API Key
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={newKey.key}
                    onChange={(e) =>
                      setNewKey({ ...newKey, key: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="Enter your API key"
                  />
                </div>
                {(newKey.provider === "groq" ||
                  newKey.provider === "ollama") && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="model" className="text-right">
                      Model
                    </Label>
                    <Select
                      value={newKey.model || getDefaultModel(newKey.provider)}
                      onValueChange={(value) =>
                        setNewKey({ ...newKey, model: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableModels(newKey.provider).map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleAddKey}>Add Key</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {apiKeys.map((key, index) => (
          <div key={key.id}>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{key.name}</span>
                  {key.isActive && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                {getProviderBadge(key.provider)}
              </div>
              <div className="text-xs text-muted-foreground space-y-1 mb-3">
                <div className="flex items-center space-x-2">
                  <span>Key:</span>
                  <code className="bg-muted px-1 rounded text-xs">
                    {showKeys[key.id] ? key.key : maskKey(key.key)}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleKeyVisibility(key.id)}
                    className="h-4 w-4 p-0"
                  >
                    {showKeys[key.id] ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                {key.model && <div>Model: {key.model}</div>}
                <div>Created: {key.createdAt}</div>
                {key.lastUsed && <div>Last used: {key.lastUsed}</div>}
              </div>
              <div className="flex justify-end space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleActive(key.id)}
                  className="h-6 px-2"
                >
                  {key.isActive ? (
                    <X className="h-3 w-3 text-red-500" />
                  ) : (
                    <Check className="h-3 w-3 text-green-500" />
                  )}
                </Button>
                <Dialog
                  open={isEditDialogOpen && editingKey?.id === key.id}
                  onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) setEditingKey(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingKey({ ...key })}
                      className="h-6 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit API Key</DialogTitle>
                      <DialogDescription>
                        Update the API key details.
                      </DialogDescription>
                    </DialogHeader>
                    {editingKey && (
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-name" className="text-right">
                            Name
                          </Label>
                          <Input
                            id="edit-name"
                            value={editingKey.name}
                            onChange={(e) =>
                              setEditingKey({
                                ...editingKey,
                                name: e.target.value,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-key" className="text-right">
                            API Key
                          </Label>
                          <Input
                            id="edit-key"
                            type="password"
                            value={editingKey.key}
                            onChange={(e) =>
                              setEditingKey({
                                ...editingKey,
                                key: e.target.value,
                              })
                            }
                            className="col-span-3"
                          />
                        </div>
                        {(editingKey.provider === "groq" ||
                          editingKey.provider === "ollama") && (
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-model" className="text-right">
                              Model
                            </Label>
                            <Select
                              value={
                                editingKey.model ||
                                getDefaultModel(editingKey.provider)
                              }
                              onValueChange={(value) =>
                                setEditingKey({
                                  ...editingKey,
                                  model: value,
                                })
                              }
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableModels(editingKey.provider).map(
                                  (model) => (
                                    <SelectItem key={model} value={model}>
                                      {model}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                    <DialogFooter>
                      <Button onClick={handleEditKey}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete &quot;{key.name}&quot;?
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteKey(key.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {index < apiKeys.length - 1 && <Separator className="my-3" />}
          </div>
        ))}
        {apiKeys.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No API keys configured</p>
            <p className="text-xs">Click &quot;Add Key&quot; to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiKeyManager;
