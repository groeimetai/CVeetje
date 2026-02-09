'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Key, Trash2, Save, Eye, EyeOff, User, Shield, Loader2, ExternalLink, Cpu, DollarSign, AlertTriangle, Sparkles, Coins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/auth/auth-context';
import type { ProviderInfo } from '@/lib/ai/models-registry';
import type { LLMMode } from '@/types';

const apiKeySchema = z.object({
  provider: z.string().min(1, 'Please select a provider'),
  apiKey: z.string().min(10, 'API key is too short'),
  model: z.string().min(1, 'Please select a model'),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

// Provider API key URLs
const providerKeyUrls: Record<string, { name: string; url: string }> = {
  openai: { name: 'OpenAI Dashboard', url: 'https://platform.openai.com/api-keys' },
  anthropic: { name: 'Anthropic Console', url: 'https://console.anthropic.com/settings/keys' },
  google: { name: 'Google AI Studio', url: 'https://aistudio.google.com/app/apikey' },
  'google-vertex': { name: 'Google Cloud Console', url: 'https://console.cloud.google.com/apis/credentials' },
  groq: { name: 'Groq Console', url: 'https://console.groq.com/keys' },
  mistral: { name: 'Mistral Console', url: 'https://console.mistral.ai/api-keys' },
  deepseek: { name: 'DeepSeek Dashboard', url: 'https://platform.deepseek.com/api_keys' },
  fireworks: { name: 'Fireworks Console', url: 'https://fireworks.ai/api-keys' },
  together: { name: 'Together AI', url: 'https://api.together.xyz/settings/api-keys' },
  azure: { name: 'Azure Portal', url: 'https://portal.azure.com' },
  cohere: { name: 'Cohere Dashboard', url: 'https://dashboard.cohere.com/api-keys' },
};

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  if (price < 0.1) return `$${price.toFixed(3)}`;
  return `$${price.toFixed(2)}`;
}

export default function SettingsPage() {
  const { userData, firebaseUser, credits, refreshUserData, logout, llmMode } = useAuth();
  const t = useTranslations('settings');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [selectedLlmMode, setSelectedLlmMode] = useState<LLMMode>(llmMode);

  // Sync selectedLlmMode when llmMode from context changes
  useEffect(() => {
    setSelectedLlmMode(llmMode);
  }, [llmMode]);

  const handleLlmModeChange = async (mode: LLMMode) => {
    setSelectedLlmMode(mode);
    setSavingMode(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/llm-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update AI mode');
      }

      await refreshUserData();
      setMessage({ type: 'success', text: t('messages.llmModeSaved') });
    } catch (err) {
      // Revert on error
      setSelectedLlmMode(llmMode);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update AI mode',
      });
    } finally {
      setSavingMode(false);
    }
  };

  // Dynamic providers state
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    userData?.apiKey?.provider || ''
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      provider: userData?.apiKey?.provider || '',
      apiKey: '',
      model: userData?.apiKey?.model || '',
    },
  });

  const watchedProvider = watch('provider');
  const watchedModel = watch('model');

  // Fetch providers on mount
  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch('/api/models');
        const data = await response.json();

        if (data.success && data.providers) {
          setProviders(data.providers);

          // Set default provider if none selected
          if (!selectedProvider && data.providers.length > 0) {
            const defaultProvider = userData?.apiKey?.provider || data.providers[0].id;
            setSelectedProvider(defaultProvider);
            setValue('provider', defaultProvider);

            // Set default model
            const provider = data.providers.find((p: ProviderInfo) => p.id === defaultProvider);
            if (provider && provider.models.length > 0) {
              const defaultModel = userData?.apiKey?.model || provider.models[0].id;
              setValue('model', defaultModel);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      } finally {
        setLoadingProviders(false);
      }
    }

    fetchProviders();
  }, [selectedProvider, setValue, userData?.apiKey?.provider, userData?.apiKey?.model]);

  // Get current provider's models
  const currentProviderModels = providers.find(p => p.id === selectedProvider)?.models || [];
  const selectedModelInfo = currentProviderModels.find(m => m.id === watchedModel);

  const onSubmit = async (data: ApiKeyFormData) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save API key');
      }

      await refreshUserData();
      setMessage({ type: 'success', text: t('messages.apiKeySaved') });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : t('messages.apiKeySaved'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!confirm(t('messages.confirmRemove'))) return;

    setRemoving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to remove API key');
      }

      await refreshUserData();
      setMessage({ type: 'success', text: t('messages.apiKeyRemoved') });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : t('messages.apiKeyRemoved'),
      });
    } finally {
      setRemoving(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    setValue('provider', providerId);
    setSelectedProvider(providerId);

    // Set first model of new provider
    const provider = providers.find(p => p.id === providerId);
    if (provider && provider.models.length > 0) {
      setValue('model', provider.models[0].id);
    }
  };

  // State for the model switcher in current config (provider is fixed to the API key's provider)
  const [configModel, setConfigModel] = useState(userData?.apiKey?.model || '');
  const configProviderModels = providers.find(p => p.id === userData?.apiKey?.provider)?.models || [];
  const configModelInfo = configProviderModels.find(m => m.id === configModel);

  // Sync configModel when userData changes
  useEffect(() => {
    if (userData?.apiKey) {
      setConfigModel(userData.apiKey.model);
    }
  }, [userData?.apiKey?.model]);

  const handleSaveModel = async () => {
    if (!userData?.apiKey) return;
    setSavingModel(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: configModel }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update model');
      }

      await refreshUserData();
      setMessage({ type: 'success', text: t('messages.modelChanged') });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update model',
      });
    } finally {
      setSavingModel(false);
    }
  };

  const modelHasChanged = userData?.apiKey
    ? configModel !== userData.apiKey.model
    : false;

  const getProviderKeyUrl = (providerId: string) => {
    return providerKeyUrls[providerId] || null;
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setMessage({ type: 'error', text: t('account.deleteConfirmationError') });
      return;
    }

    setDeletingAccount(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/account', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Logout and redirect to home
      await logout();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : t('account.deleteError'),
      });
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Tabs defaultValue="api-key">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="api-key" className="flex-1 sm:flex-initial">
            <Key className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.apiKey')}</span>
            <span className="sm:hidden">API</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-1 sm:flex-initial">
            <User className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.account')}</span>
            <span className="sm:hidden">Account</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-key" className="space-y-6">
          {/* AI Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {t('aiMode.title')}
              </CardTitle>
              <CardDescription>
                {t('aiMode.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {savingMode && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('aiMode.saving')}
                </div>
              )}

              {/* Own Key option */}
              <button
                type="button"
                onClick={() => handleLlmModeChange('own-key')}
                disabled={savingMode}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedLlmMode === 'own-key'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{t('aiMode.ownKey')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('aiMode.ownKeyDescription')}
                    </p>
                  </div>
                </div>
              </button>

              {/* Platform AI option */}
              <button
                type="button"
                onClick={() => handleLlmModeChange('platform')}
                disabled={savingMode}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedLlmMode === 'platform'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t('aiMode.platform')}</p>
                      <Badge variant="secondary" className="text-xs">{t('aiMode.platformModel')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('aiMode.platformDescription')}
                    </p>
                  </div>
                </div>
              </button>

              {/* Platform AI details */}
              {selectedLlmMode === 'platform' && (
                <div className="ml-8 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {t('aiMode.currentCredits', { credits })}
                    </span>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('aiMode.platformCostLabel')}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span>{t('aiMode.platformCostTable.profileParse')}</span>
                      <span className="text-right">{t('aiMode.platformCostTable.creditsCost')}</span>
                      <span>{t('aiMode.platformCostTable.jobParse')}</span>
                      <span className="text-right">{t('aiMode.platformCostTable.creditsCost')}</span>
                      <span>{t('aiMode.platformCostTable.fitAnalysis')}</span>
                      <span className="text-right">{t('aiMode.platformCostTable.creditsCost')}</span>
                      <span>{t('aiMode.platformCostTable.styleGenerate')}</span>
                      <span className="text-right">{t('aiMode.platformCostTable.creditsCost')}</span>
                      <span>{t('aiMode.platformCostTable.cvGenerate')}</span>
                      <span className="text-right">{t('aiMode.platformCostTable.creditsCost')}</span>
                      <span>{t('aiMode.platformCostTable.cvChat')}</span>
                      <span className="text-right">{t('aiMode.platformCostTable.creditsCost')}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t('aiMode.tipOwnKey')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Configuration — only show when in own-key mode */}
          {selectedLlmMode === 'own-key' && userData?.apiKey && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  {t('currentConfig.title')}
                </CardTitle>
                <CardDescription>
                  {t('currentConfig.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {message && message.type === 'success' && (
                  <Alert className="mb-2">
                    {message.text}
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('currentConfig.provider')}</p>
                    <p className="text-muted-foreground capitalize">
                      {providers.find(p => p.id === userData.apiKey?.provider)?.name || userData.apiKey.provider}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {userData.apiKey.provider}
                  </Badge>
                </div>
                <Separator />

                <div className="space-y-2">
                  <Label>{t('currentConfig.model')}</Label>
                  <Select
                    value={configModel}
                    onValueChange={setConfigModel}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {configProviderModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatPrice(model.pricing.input)}/1M in · {formatPrice(model.pricing.output)}/1M out
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {configModelInfo && (
                    <div className="mt-2 p-3 bg-muted rounded-lg space-y-3">
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        {configModelInfo.limits.context > 0 && (
                          <div className="flex items-center gap-1">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                            <span>{(configModelInfo.limits.context / 1000).toFixed(0)}k {t('configureApiKey.context')}</span>
                          </div>
                        )}
                        {configModelInfo.pricing.input > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{formatPrice(configModelInfo.pricing.input)} / 1M in</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={configModelInfo.capabilities.structuredOutput ? "default" : "outline"} className="text-xs">
                          {configModelInfo.capabilities.structuredOutput ? "✓" : "✗"} {t('configureApiKey.structuredOutput')}
                        </Badge>
                        <Badge variant={configModelInfo.capabilities.toolCall ? "default" : "outline"} className="text-xs">
                          {configModelInfo.capabilities.toolCall ? "✓" : "✗"} {t('configureApiKey.toolCall')}
                        </Badge>
                        <Badge variant={configModelInfo.capabilities.reasoning ? "default" : "outline"} className="text-xs">
                          {configModelInfo.capabilities.reasoning ? "✓" : "✗"} {t('configureApiKey.reasoning')}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {modelHasChanged && (
                  <Button
                    onClick={handleSaveModel}
                    disabled={savingModel}
                    size="sm"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {savingModel ? t('currentConfig.savingModel') : t('currentConfig.changeModel')}
                  </Button>
                )}

                <Separator />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveApiKey}
                  disabled={removing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {removing ? t('currentConfig.removing') : t('currentConfig.removeApiKey')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Configure API Key — only show when in own-key mode */}
          {selectedLlmMode === 'own-key' && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {userData?.apiKey ? t('configureApiKey.updateTitle') : t('configureApiKey.title')}
              </CardTitle>
              <CardDescription>
                {t('configureApiKey.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {message && (
                <Alert
                  variant={message.type === 'error' ? 'destructive' : 'default'}
                  className="mb-4"
                >
                  {message.text}
                </Alert>
              )}

              {loadingProviders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">{t('configureApiKey.loadingProviders')}</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">{t('configureApiKey.provider')}</Label>
                    <Select
                      value={watchedProvider}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('configureApiKey.selectProvider')} />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            <div className="flex items-center gap-2">
                              <span>{provider.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {provider.models.length} {t('configureApiKey.models')}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.provider && (
                      <p className="text-sm text-destructive">{errors.provider.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">{t('currentConfig.model')}</Label>
                    <Select
                      value={watchedModel}
                      onValueChange={(value) => setValue('model', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('configureApiKey.selectModel')} />
                      </SelectTrigger>
                      <SelectContent>
                        {currentProviderModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                              <span>{model.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatPrice(model.pricing.input)}/1M in · {formatPrice(model.pricing.output)}/1M out
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.model && (
                      <p className="text-sm text-destructive">{errors.model.message}</p>
                    )}

                    {/* Model details */}
                    {selectedModelInfo && (
                      <div className="mt-2 p-3 bg-muted rounded-lg space-y-3">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          {selectedModelInfo.limits.context > 0 && (
                            <div className="flex items-center gap-1">
                              <Cpu className="h-4 w-4 text-muted-foreground" />
                              <span>{(selectedModelInfo.limits.context / 1000).toFixed(0)}k {t('configureApiKey.context')}</span>
                            </div>
                          )}
                          {selectedModelInfo.pricing.input > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>{formatPrice(selectedModelInfo.pricing.input)} / 1M in</span>
                            </div>
                          )}
                          {selectedModelInfo.pricing.output > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>{formatPrice(selectedModelInfo.pricing.output)} / 1M out</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">{t('configureApiKey.capabilities')}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={selectedModelInfo.capabilities.structuredOutput ? "default" : "outline"} className="text-xs">
                              {selectedModelInfo.capabilities.structuredOutput ? "✓" : "✗"} {t('configureApiKey.structuredOutput')}
                            </Badge>
                            <Badge variant={selectedModelInfo.capabilities.toolCall ? "default" : "outline"} className="text-xs">
                              {selectedModelInfo.capabilities.toolCall ? "✓" : "✗"} {t('configureApiKey.toolCall')}
                            </Badge>
                            <Badge variant={selectedModelInfo.capabilities.reasoning ? "default" : "outline"} className="text-xs">
                              {selectedModelInfo.capabilities.reasoning ? "✓" : "✗"} {t('configureApiKey.reasoning')}
                            </Badge>
                          </div>
                        </div>
                        {selectedModelInfo.modalities?.input && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">{t('configureApiKey.inputTypes')}</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedModelInfo.modalities.input.map((modality) => (
                                <Badge key={modality} variant="secondary" className="text-xs capitalize">
                                  {modality}
                                </Badge>
                              ))}
                            </div>
                            {(selectedModelInfo.modalities.input.includes('image') || selectedModelInfo.modalities.input.includes('pdf')) && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ {t('configureApiKey.supportsUpload')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">{t('configureApiKey.apiKey')}</Label>
                    <div className="relative">
                      <Input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        placeholder={t('configureApiKey.enterApiKey', { provider: providers.find(p => p.id === selectedProvider)?.name || 'provider' })}
                        {...register('apiKey')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.apiKey && (
                      <p className="text-sm text-destructive">{errors.apiKey.message}</p>
                    )}
                    {getProviderKeyUrl(selectedProvider) && (
                      <p className="text-xs text-muted-foreground">
                        {t('configureApiKey.getApiKey')}{' '}
                        <a
                          href={getProviderKeyUrl(selectedProvider)!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {getProviderKeyUrl(selectedProvider)!.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? t('configureApiKey.saving') : t('configureApiKey.saveApiKey')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>}
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('account.title')}</CardTitle>
              <CardDescription>{t('account.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('account.name')}</p>
                <p>{userData?.displayName || t('account.notSet')}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('account.email')}</p>
                <p>{firebaseUser?.email}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('account.createdAt')}</p>
                <p>
                  {userData?.createdAt?.toDate?.()?.toLocaleDateString() || t('account.unknown')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delete Account - Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('account.dangerZone')}
              </CardTitle>
              <CardDescription>{t('account.deleteDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && message.type === 'error' && (
                <Alert variant="destructive">
                  {message.text}
                </Alert>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('account.deleteWarning')}
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>{t('account.deleteItem1')}</li>
                  <li>{t('account.deleteItem2')}</li>
                  <li>{t('account.deleteItem3')}</li>
                  <li>{t('account.deleteItem4')}</li>
                </ul>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="deleteConfirmation">{t('account.typeDelete')}</Label>
                <Input
                  id="deleteConfirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="max-w-xs"
                />
              </div>

              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmation !== 'DELETE'}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingAccount ? t('account.deleting') : t('account.deleteButton')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
