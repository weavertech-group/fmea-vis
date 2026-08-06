"use client";

import type { ApiResponseType } from "@/types/fmea";
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { parseJsonWithBigInt } from "@/lib/bigint-utils";
import {
  DEFAULT_API_BASE,
  DEFAULT_API_PAYLOADS,
  EXAMPLE_JSON,
  TYPE_META,
} from "@/data/examples";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DataInputPanelProps {
  onJsonSubmit: (json: string, type: ApiResponseType) => void;
  disabled?: boolean;
  initialType?: ApiResponseType;
  className?: string;
  hideHeader?: boolean;
}

export function DataInputPanel({
  onJsonSubmit,
  disabled,
  initialType = "dfmea",
  className,
  hideHeader,
}: DataInputPanelProps) {
  const [apiType, setApiType] = useState<ApiResponseType>(initialType);
  const [jsonInput, setJsonInput] = useState<string>(EXAMPLE_JSON[initialType]);
  const [apiUrl, setApiUrl] = useState<string>(`${DEFAULT_API_BASE}${initialType}`);
  const [apiPayload, setApiPayload] = useState<string>(DEFAULT_API_PAYLOADS[initialType]);
  const [isFetchingApiData, setIsFetchingApiData] = useState(false);
  const [apiFetchError, setApiFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setJsonInput(EXAMPLE_JSON[apiType]);
    setApiUrl(`${DEFAULT_API_BASE}${apiType}`);
    setApiPayload(DEFAULT_API_PAYLOADS[apiType]);
    setApiFetchError(null);
  }, [apiType]);

  const handleSubmit = () => onJsonSubmit(jsonInput, apiType);

  const handleLoadExample = () => {
    setJsonInput(EXAMPLE_JSON[apiType]);
    toast({ title: "Sample loaded", description: TYPE_META[apiType].label });
  };

  const handleFetchFromApi = async () => {
    setIsFetchingApiData(true);
    setApiFetchError(null);
    let parsedPayload;
    try {
      parsedPayload = parseJsonWithBigInt(apiPayload);
    } catch {
      toast({
        variant: "destructive",
        title: "Invalid payload",
        description: "Request body is not valid JSON.",
      });
      setIsFetchingApiData(false);
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPayload),
        mode: "cors",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const responseDataText = await response.text();
      try {
        parseJsonWithBigInt(responseDataText);
        setJsonInput(responseDataText);
        toast({ title: "Fetched", description: "API response loaded." });
      } catch {
        setJsonInput(responseDataText);
        toast({
          variant: "destructive",
          title: "Non-JSON response",
          description: "Loaded as text.",
        });
      }
    } catch (error: any) {
      const description = error?.message || "Unknown fetch error.";
      setApiFetchError(description);
      toast({ variant: "destructive", title: "API failed", description });
    } finally {
      setIsFetchingApiData(false);
    }
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {!hideHeader && (
        <p className="mb-2 text-sm font-medium">Load structure</p>
      )}

      <div className="mb-3 shrink-0 space-y-1.5">
        <Label htmlFor="apiType">Analysis type</Label>
        <Select
          value={apiType}
          onValueChange={(v) => setApiType(v as ApiResponseType)}
          disabled={disabled || isFetchingApiData}
        >
          <SelectTrigger id="apiType" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_META) as ApiResponseType[]).map((key) => (
              <SelectItem key={key} value={key}>
                {TYPE_META[key].short} — {TYPE_META[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{TYPE_META[apiType].description}</p>
      </div>

      <Tabs defaultValue="paste" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mb-2 h-9 w-full justify-start">
          <TabsTrigger value="paste" className="text-xs">
            Paste
          </TabsTrigger>
          <TabsTrigger value="api" className="text-xs">
            API
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="paste"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="mb-1.5 flex shrink-0 items-center justify-between">
            <Label htmlFor="jsonInput">JSON</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLoadExample}
              disabled={disabled || isFetchingApiData}
            >
              Load sample
            </Button>
          </div>
          <Textarea
            id="jsonInput"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste FMEA Agent JSON…"
            className="min-h-[120px] flex-1 text-xs"
            disabled={disabled || isFetchingApiData}
          />
        </TabsContent>

        <TabsContent
          value="api"
          className="mt-0 flex min-h-0 flex-1 flex-col space-y-2 data-[state=inactive]:hidden"
        >
          <div className="space-y-1.5">
            <Label htmlFor="apiUrl">Endpoint</Label>
            <Input
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="font-mono text-xs"
              disabled={disabled || isFetchingApiData}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
            <Label htmlFor="apiPayload">Body</Label>
            <Textarea
              id="apiPayload"
              value={apiPayload}
              onChange={(e) => setApiPayload(e.target.value)}
              className="min-h-[80px] flex-1 text-xs"
              disabled={disabled || isFetchingApiData}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleFetchFromApi}
            className="w-full"
            disabled={disabled || isFetchingApiData}
          >
            {isFetchingApiData ? "Fetching…" : "Fetch"}
          </Button>
          {apiFetchError && (
            <p className="text-xs text-destructive">{apiFetchError}</p>
          )}
        </TabsContent>
      </Tabs>

      <Button
        type="button"
        onClick={handleSubmit}
        className="mt-3 w-full shrink-0"
        disabled={disabled || isFetchingApiData || !jsonInput.trim()}
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Visualize
      </Button>
    </div>
  );
}

export function TypeLaunchCards({
  onLaunch,
  disabled,
}: {
  onLaunch: (json: string, type: ApiResponseType) => void;
  disabled?: boolean;
}) {
  const types: ApiResponseType[] = ["requirements", "dfmea", "pfmea"];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {types.map((type) => {
        const meta = TYPE_META[type];
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onLaunch(EXAMPLE_JSON[type], type)}
            className="rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50"
          >
            <span className="font-mono text-[11px] font-semibold text-primary">
              {meta.short}
            </span>
            <h3 className="mt-1 text-sm font-semibold">{meta.label}</h3>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {meta.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
